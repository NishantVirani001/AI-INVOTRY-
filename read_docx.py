import docx

doc = docx.Document("Inventory_Management_Project_Report.docx")
for i, para in enumerate(doc.paragraphs):
    if para.text.strip():
        style_name = para.style.name if para.style else "No Style"
        print(f"[{style_name}] {para.text}")
