from flask import Flask, request, jsonify, send_from_directory, render_template, send_file
from flask_cors import CORS
import os
from calculator import calculate_emissions
from pdf_generator import generate_pdf_report

# Use frontend files from backend directory (copied for deployment)
STATIC_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '.'))
TEMPLATE_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '.'))

app = Flask(
    __name__,
    static_folder=STATIC_FOLDER,
    template_folder=TEMPLATE_FOLDER
)
CORS(app)

@app.route('/')
def index():
    print(f"Serving from STATIC_FOLDER: {STATIC_FOLDER}")
    print(f"Files in static folder: {os.listdir(STATIC_FOLDER)}")
    return send_from_directory(STATIC_FOLDER, 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    print(f"Serving static file: {path} from {STATIC_FOLDER}")
    return send_from_directory(STATIC_FOLDER, path)

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.get_json()
    result = calculate_emissions(data)
    return jsonify(result)

@app.route('/generate-report', methods=['POST'])
def generate_report():
    data = request.get_json()
    # reuse the same calculation to get periods etc.
    result = calculate_emissions(data)
    outputs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'outputs'))
    filename = f"ll97_report_{result.get('buildingName','report').replace(' ', '_')}.pdf"
    output_path = os.path.join(outputs_dir, filename)
    chart_image = data.get('chartImageBase64')  # optional base64 PNG from canvas
    path = generate_pdf_report(output_path, result, chart_image_base64=chart_image)
    return send_file(path, mimetype='application/pdf', as_attachment=True, download_name=filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
