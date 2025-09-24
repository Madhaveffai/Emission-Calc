from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import os
import base64
from io import BytesIO


def _img_from_base64(data_url: str, max_width: float):
    if not data_url:
        return None
    try:
        # Accept full data URLs or raw base64
        if ',' in data_url:
            b64 = data_url.split(',', 1)[1]
        else:
            b64 = data_url
        img_bytes = base64.b64decode(b64)
        bio = BytesIO(img_bytes)
        img = Image(bio)
        # Scale to fit width
        if img.drawWidth > max_width:
            scale = max_width / img.drawWidth
            img.drawWidth *= scale
            img.drawHeight *= scale
        return img
    except Exception:
        return None


def generate_pdf_report(output_path: str, payload: dict, chart_image_base64: str = None) -> str:
    """
    Generate a simple LL97 emissions PDF report.
    Returns the output file path.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(output_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Section', fontSize=12, leading=14, spaceAfter=6, spaceBefore=6, fontName='Helvetica-Bold'))
    elems = []

    title = payload.get('buildingName', 'LL97 Emissions Report')
    elems.append(Paragraph('LL97 Emissions Report', styles['Title']))
    elems.append(Paragraph(title, styles['Heading2']))
    elems.append(Spacer(1, 12))

    # Areas table
    areas_data = [['Area Type', 'Area (sq ft)']]
    for k, v in (payload.get('areas') or {}).items():
        areas_data.append([k, f"{v:,.0f}"])
    areas_table = Table(areas_data, hAlign='LEFT', colWidths=[2.5*inch, 1.5*inch])
    areas_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold')
    ]))
    elems.append(Paragraph('Building Area Breakdown', styles['Section']))
    elems.append(areas_table)
    elems.append(Spacer(1, 12))

    # Utility table
    util = payload.get('utilityUsage') or {}
    util_rows = [
        ['Utility', 'Usage'],
        ['Electricity (kWh)', f"{util.get('electricity', 0):,}"],
        ['Gas (therms)', f"{util.get('gas', 0):,}"],
        ['Fuel Oil #2 (gal)', f"{util.get('fuelOil2', 0):,}"],
        ['Fuel Oil #4 (gal)', f"{util.get('fuelOil4', 0):,}"],
        ['Steam (MLb)', f"{util.get('steam', 0):,}"]
    ]
    util_table = Table(util_rows, hAlign='LEFT', colWidths=[2.5*inch, 1.5*inch])
    util_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold')
    ]))
    elems.append(Paragraph('Annual Utility Data', styles['Section']))
    elems.append(util_table)
    elems.append(Spacer(1, 12))

    # Period summary table
    periods = payload.get('periods') or []
    header = ['Year', 'Emissions (tCO2e/yr)', 'Limit (tCO2e/yr)', 'Overage (tCO2e/yr)', 'Penalty ($/yr)']
    data = [header]
    for p in periods:
        data.append([
            p.get('label', ''),
            f"{p.get('totalEmissions', 0):.2f}",
            '-' if p.get('totalLimit') is None else f"{p.get('totalLimit', 0):.2f}",
            '-' if p.get('overage') is None else f"{p.get('overage', 0):.2f}",
            '-' if p.get('penalty') is None else f"${int(round(p.get('penalty', 0))):,}"
        ])
    table = Table(data, hAlign='LEFT', colWidths=[1.2*inch, 1.6*inch, 1.6*inch, 1.6*inch, 1.4*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f3f4f6')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold')
    ]))
    elems.append(Paragraph('Emissions Summary', styles['Section']))
    elems.append(table)
    elems.append(Spacer(1, 16))

    # Chart image (from frontend canvas)
    chart_img = _img_from_base64(chart_image_base64, max_width=letter[0] - 72)
    if chart_img:
        elems.append(Paragraph('LL97 Carbon Emissions', styles['Section']))
        elems.append(chart_img)

    doc.build(elems)
    return output_path
