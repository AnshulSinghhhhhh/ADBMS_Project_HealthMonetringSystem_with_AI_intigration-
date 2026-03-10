"""
backend/routers/reports.py
---------------------------
GET /reports/export — generate and stream a PDF health report for the current user.
"""

import io
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from database import get_db
from auth import get_current_user
import models

router = APIRouter(tags=["Reports"])

# ── Color palette ──────────────────────────────────────────────────────────────
BLUE_DARK  = colors.HexColor("#1e3a8a")
BLUE       = colors.HexColor("#2563eb")
CYAN       = colors.HexColor("#06b6d4")
GREEN      = colors.HexColor("#10b981")
YELLOW     = colors.HexColor("#f59e0b")
RED        = colors.HexColor("#ef4444")
GRAY_LIGHT = colors.HexColor("#f1f5f9")
GRAY       = colors.HexColor("#94a3b8")
WHITE      = colors.white
BLACK      = colors.HexColor("#0f172a")

SEVERITY_COLORS = {
    "low":      colors.HexColor("#06b6d4"),
    "moderate": YELLOW,
    "high":     colors.HexColor("#f97316"),
    "critical": RED,
}
RISK_COLORS = {"low": GREEN, "moderate": YELLOW, "high": RED}


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("title", parent=base["Title"],
            fontSize=22, textColor=WHITE, spaceAfter=4, alignment=TA_CENTER,
            fontName="Helvetica-Bold"),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"],
            fontSize=10, textColor=CYAN, spaceAfter=8, alignment=TA_CENTER),
        "section": ParagraphStyle("section", parent=base["Heading2"],
            fontSize=13, textColor=BLUE_DARK, spaceBefore=16, spaceAfter=6,
            fontName="Helvetica-Bold"),
        "body": ParagraphStyle("body", parent=base["Normal"],
            fontSize=9, textColor=BLACK, leading=14),
        "footer": ParagraphStyle("footer", parent=base["Normal"],
            fontSize=8, textColor=GRAY, alignment=TA_CENTER, spaceBefore=12),
        "summary_text": ParagraphStyle("summary_text", parent=base["Normal"],
            fontSize=9, textColor=BLACK, leading=15, borderPadding=(6, 8, 6, 8),
            backColor=GRAY_LIGHT, borderRadius=4),
    }


def _section_header(title: str, st: dict):
    return [
        Paragraph(title, st["section"]),
        HRFlowable(width="100%", thickness=1.5, color=BLUE, spaceAfter=8),
    ]


def _score_color(risk: str | None):
    return RISK_COLORS.get(risk, BLUE)


@router.get("/export")
def export_report(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

    # ── Fetch data ─────────────────────────────────────────────────────────────
    vitals = (
        db.query(models.Vital)
        .filter(models.Vital.user_id == current_user.user_id,
                models.Vital.recorded_at >= seven_days_ago)
        .order_by(models.Vital.recorded_at.asc())
        .all()
    )
    latest_score = (
        db.query(models.HealthScore)
        .filter(models.HealthScore.user_id == current_user.user_id)
        .order_by(models.HealthScore.generated_at.desc())
        .first()
    )
    alerts = (
        db.query(models.Alert)
        .filter(models.Alert.user_id == current_user.user_id,
                models.Alert.created_at >= seven_days_ago)
        .order_by(models.Alert.created_at.desc())
        .all()
    )
    meds = (
        db.query(models.Medication)
        .filter(models.Medication.user_id == current_user.user_id)
        .all()
    )

    taken  = sum(1 for m in meds if m.status == "taken")
    missed = sum(1 for m in meds if m.status == "missed")
    total  = len(meds)

    # ── Build PDF ──────────────────────────────────────────────────────────────
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )
    st = _styles()
    story = []

    # ── HEADER BANNER ──────────────────────────────────────────────────────────
    header_data = [[
        Paragraph("🏥 HealthAI — Personal Health Report", st["title"]),
    ]]
    header_table = Table(header_data, colWidths=[doc.width])
    header_table.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,-1), BLUE_DARK),
        ("TOPPADDING",  (0,0), (-1,-1), 14),
        ("BOTTOMPADDING", (0,0), (-1,-1), 14),
        ("LEFTPADDING",   (0,0), (-1,-1), 12),
        ("RIGHTPADDING",  (0,0), (-1,-1), 12),
        ("ROUNDEDCORNERS", (0,0), (-1,-1), [8]),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    # Meta row
    now_str     = datetime.now().strftime("%d %b %Y, %I:%M %p")
    age_str     = str(current_user.age) if current_user.age else "N/A"
    gender_str  = current_user.gender   or "N/A"
    meta_data   = [[
        Paragraph(f"<b>Generated:</b> {now_str}", st["body"]),
        Paragraph(f"<b>Patient:</b> {current_user.name}", st["body"]),
        Paragraph(f"<b>Age:</b> {age_str}  &nbsp; <b>Gender:</b> {gender_str}", st["body"]),
    ]]
    meta_table = Table(meta_data, colWidths=[doc.width/3]*3)
    meta_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), GRAY_LIGHT),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # ── SECTION 1 — Health Summary ─────────────────────────────────────────────
    story += _section_header("Section 1 — Health Summary", st)

    if latest_score:
        rc   = _score_color(latest_score.risk_level)
        score_data = [[
            Paragraph(f"<b>Risk Score:</b> {latest_score.score} / 100", st["body"]),
            Paragraph(
                f"<b>Risk Level:</b> "
                f"<font color='#{rc.hexval()[2:] if hasattr(rc,'hexval') else 'f59e0b'}'>"
                f"{(latest_score.risk_level or 'N/A').upper()}</font>",
                st["body"],
            ),
        ]]
        score_table = Table(score_data, colWidths=[doc.width/2]*2)
        score_table.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,-1), GRAY_LIGHT),
            ("TOPPADDING",    (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("LEFTPADDING",   (0,0), (-1,-1), 10),
            ("RIGHTPADDING",  (0,0), (-1,-1), 10),
        ]))
        story.append(score_table)
        story.append(Spacer(1, 8))

        if latest_score.ai_summary:
            summary_clean = latest_score.ai_summary.replace("📊", "").replace("•", "-").strip()
            story.append(Paragraph("<b>AI Summary:</b>", st["body"]))
            story.append(Spacer(1, 4))
            summary_data = [[Paragraph(summary_clean, st["body"])]]
            summary_table = Table(summary_data, colWidths=[doc.width])
            summary_table.setStyle(TableStyle([
                ("BACKGROUND",    (0,0), (-1,-1), GRAY_LIGHT),
                ("TOPPADDING",    (0,0), (-1,-1), 8),
                ("BOTTOMPADDING", (0,0), (-1,-1), 8),
                ("LEFTPADDING",   (0,0), (-1,-1), 10),
                ("RIGHTPADDING",  (0,0), (-1,-1), 10),
            ]))
            story.append(summary_table)
    else:
        story.append(Paragraph("No health score available. Log vitals and generate a weekly report first.", st["body"]))

    story.append(Spacer(1, 12))

    # ── SECTION 2 — Vitals This Week ──────────────────────────────────────────
    story += _section_header("Section 2 — Vitals This Week", st)

    if vitals:
        col_widths = [2.5*cm, 2.2*cm, 2.5*cm, 2.2*cm, 2.8*cm, 2.0*cm]
        header_row = [
            Paragraph("<b>Date</b>",        st["body"]),
            Paragraph("<b>Heart Rate</b>",  st["body"]),
            Paragraph("<b>BP (S/D)</b>",    st["body"]),
            Paragraph("<b>SpO₂ (%)</b>",    st["body"]),
            Paragraph("<b>Blood Sugar</b>", st["body"]),
            Paragraph("<b>Temp (°C)</b>",   st["body"]),
        ]
        rows = [header_row]
        for i, v in enumerate(vitals):
            date_str = v.recorded_at.strftime("%d %b") if v.recorded_at else "—"
            bp_str   = f"{v.bp_systolic}/{v.bp_diastolic}" if v.bp_systolic and v.bp_diastolic else "—"
            rows.append([
                Paragraph(date_str,                   st["body"]),
                Paragraph(f"{v.heart_rate or '—'} bpm", st["body"]),
                Paragraph(bp_str,                     st["body"]),
                Paragraph(f"{v.spo2 or '—'}",         st["body"]),
                Paragraph(f"{v.blood_sugar or '—'} mg/dL", st["body"]),
                Paragraph(f"{v.temperature or '—'}",  st["body"]),
            ])

        vitals_table = Table(rows, colWidths=col_widths)
        ts = TableStyle([
            ("BACKGROUND",    (0,0), (-1,0),  BLUE),
            ("TEXTCOLOR",     (0,0), (-1,0),  WHITE),
            ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [WHITE, GRAY_LIGHT]),
            ("GRID",          (0,0), (-1,-1), 0.4, GRAY),
            ("TOPPADDING",    (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
            ("RIGHTPADDING",  (0,0), (-1,-1), 6),
        ])
        vitals_table.setStyle(ts)
        story.append(vitals_table)
    else:
        story.append(Paragraph("No vitals recorded in the last 7 days.", st["body"]))

    story.append(Spacer(1, 12))

    # ── SECTION 3 — Alerts ────────────────────────────────────────────────────
    story += _section_header("Section 3 — Health Alerts (Last 7 Days)", st)

    if alerts:
        alert_rows = [[
            Paragraph("<b>Alert Type</b>",  st["body"]),
            Paragraph("<b>Severity</b>",    st["body"]),
            Paragraph("<b>Date</b>",        st["body"]),
            Paragraph("<b>Message</b>",     st["body"]),
        ]]
        for a in alerts:
            date_str = a.created_at.strftime("%d %b, %I:%M %p") if a.created_at else "—"
            sev_color = SEVERITY_COLORS.get(a.severity, GRAY)
            alert_rows.append([
                Paragraph(a.alert_type,  st["body"]),
                Paragraph(f"<b>{a.severity.upper()}</b>", st["body"]),
                Paragraph(date_str,      st["body"]),
                Paragraph(a.message,     st["body"]),
            ])
        alert_table = Table(alert_rows, colWidths=[3.5*cm, 2.0*cm, 3.0*cm, doc.width-8.5*cm])
        alert_table.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,0),  BLUE),
            ("TEXTCOLOR",     (0,0), (-1,0),  WHITE),
            ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [WHITE, GRAY_LIGHT]),
            ("GRID",          (0,0), (-1,-1), 0.4, GRAY),
            ("TOPPADDING",    (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
            ("RIGHTPADDING",  (0,0), (-1,-1), 6),
            ("VALIGN",        (0,0), (-1,-1), "TOP"),
            ("WORDWRAP",      (3,1), (3,-1),  "CJK"),
        ]))
        story.append(alert_table)
    else:
        story.append(Paragraph("No alerts in the last 7 days. 🎉", st["body"]))

    story.append(Spacer(1, 12))

    # ── SECTION 4 — Medication Adherence ──────────────────────────────────────
    story += _section_header("Section 4 — Medication Adherence", st)

    taken_pct  = round(taken  / total * 100) if total else 0
    missed_pct = round(missed / total * 100) if total else 0

    med_rows = [
        [Paragraph("<b>Total Scheduled</b>", st["body"]), Paragraph(str(total), st["body"])],
        [Paragraph("<b>Taken</b>",  st["body"]), Paragraph(f"{taken}  ({taken_pct}%)", st["body"])],
        [Paragraph("<b>Missed</b>", st["body"]), Paragraph(f"{missed} ({missed_pct}%)", st["body"])],
    ]
    med_table = Table(med_rows, colWidths=[5*cm, doc.width-5*cm])
    med_table.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0,0), (-1,-1), [GRAY_LIGHT, WHITE, GRAY_LIGHT]),
        ("GRID",           (0,0), (-1,-1), 0.4, GRAY),
        ("TOPPADDING",     (0,0), (-1,-1), 7),
        ("BOTTOMPADDING",  (0,0), (-1,-1), 7),
        ("LEFTPADDING",    (0,0), (-1,-1), 10),
        ("RIGHTPADDING",   (0,0), (-1,-1), 10),
    ]))
    story.append(med_table)
    story.append(Spacer(1, 20))

    # ── FOOTER ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY))
    story.append(Paragraph(
        "⚕️  This report is generated by <b>HealthAI</b> and is <b>not a substitute "
        "for professional medical advice</b>. Please consult a qualified healthcare provider "
        "for diagnosis and treatment.",
        st["footer"],
    ))

    # ── Build & stream ─────────────────────────────────────────────────────────
    doc.build(story)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="healthai_report.pdf"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
