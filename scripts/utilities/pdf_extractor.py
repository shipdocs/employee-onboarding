#!/usr/bin/env python3
"""
PDF Text Extractor
Extracts text from PDF files and stores key information in memory/files.
"""

import os
import json
import signal
from datetime import datetime
import pdfplumber
# PyPDF2 removed due to security vulnerability (infinite loop DoS attack)
# Using only pdfplumber which is more secure and feature-rich
from pathlib import Path


class PDFExtractor:
    def __init__(self):
        self.extracted_data = {}
        self.timeout_seconds = 30  # Timeout for PyPDF2 operations

    def timeout_handler(self, signum, frame):
        """Handle timeout for PyPDF2 operations"""
        raise TimeoutError("PDF processing timed out")

    def extract_with_fallback(self, pdf_path):
        """Fallback extraction method (PyPDF2 removed due to security vulnerability)"""
        # PyPDF2 has been removed due to DoS vulnerability
        # This method is kept for compatibility but only returns empty string
        print(f"Fallback extraction not available for {pdf_path} - PyPDF2 removed for security")
        return ""

    def is_safe_path(self, file_path):
        """Validate file path to prevent directory traversal attacks"""
        try:
            # Convert to absolute path and resolve any symbolic links
            abs_path = os.path.abspath(file_path)

            # Check if the file exists and is a regular file
            if not os.path.isfile(abs_path):
                return False

            # Check if it's a PDF file by extension
            if not abs_path.lower().endswith('.pdf'):
                return False

            # Ensure the path doesn't contain directory traversal patterns
            if '..' in file_path or file_path.startswith('/'):
                return False

            return True
        except Exception:
            return False

    def extract_with_pdfplumber(self, pdf_path):
        """Extract text using pdfplumber (preferred method)"""
        text = ""
        metadata = {}

        try:
            # Validate file path to prevent directory traversal
            if not self.is_safe_path(pdf_path):
                raise ValueError("Invalid file path")

            with pdfplumber.open(pdf_path) as pdf:
                # Extract metadata
                metadata = {
                    'total_pages': len(pdf.pages),
                    'metadata': pdf.metadata if hasattr(pdf, 'metadata') else {}
                }
                
                # Extract text from each page
                for page_num, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        text += f"\n--- Page {page_num + 1} ---\n{page_text}"
                        
        except Exception as e:
            print(f"Error with pdfplumber extraction: {e}")
            
        return text, metadata
    
    def extract_from_pdf(self, pdf_path):
        """Main extraction method"""
        print(f"Extracting text from: {pdf_path}")
        
        # Try pdfplumber first (better for complex layouts)
        text, metadata = self.extract_with_pdfplumber(pdf_path)
        
        # If pdfplumber fails or returns empty, try fallback method
        if not text.strip():
            print("Trying fallback extraction...")
            text = self.extract_with_fallback(pdf_path)
            metadata = {'extraction_method': 'fallback'}
        else:
            metadata['extraction_method'] = 'pdfplumber'
            
        return text, metadata
    
    def analyze_content(self, text, filename):
        """Analyze and summarize the extracted text"""
        lines = text.split('\n')
        word_count = len(text.split())
        
        # Extract potential key sections (basic heuristics)
        key_sections = []
        current_section = ""
        
        for line in lines:
            line = line.strip()
            if line:
                # Look for section headers (lines that are short and might be titles)
                if len(line) < 100 and (line.isupper() or line.istitle()):
                    if current_section:
                        key_sections.append(current_section)
                    current_section = f"## {line}\n"
                else:
                    current_section += line + "\n"
        
        if current_section:
            key_sections.append(current_section)
            
        analysis = {
            'filename': filename,
            'word_count': word_count,
            'line_count': len(lines),
            'key_sections_count': len(key_sections),
            'extraction_timestamp': datetime.now().isoformat()
        }
        
        return analysis, key_sections
    
    def is_safe_output_path(self, file_path):
        """Validate output file path to prevent directory traversal attacks"""
        try:
            # Convert to absolute path
            abs_path = os.path.abspath(file_path)

            # Get current working directory
            cwd = os.path.abspath(os.getcwd())

            # Ensure the output file is within the current directory
            if not abs_path.startswith(cwd):
                return False

            # Check for directory traversal patterns
            if '..' in file_path or file_path.startswith('/'):
                return False

            # Ensure filename doesn't contain dangerous characters
            filename = os.path.basename(file_path)
            if any(char in filename for char in ['<', '>', ':', '"', '|', '?', '*']):
                return False

            return True
        except Exception:
            return False

    def save_extracted_data(self, filename, text, metadata, analysis):
        """Save extracted data to files with security validation"""
        base_name = Path(filename).stem

        # Sanitize base name to prevent path traversal
        safe_base_name = "".join(c for c in base_name if c.isalnum() or c in ('-', '_')).rstrip()
        if not safe_base_name:
            safe_base_name = "extracted_pdf"

        # Create safe output file paths
        text_file = f"{safe_base_name}_extracted.txt"
        info_file = f"{safe_base_name}_info.json"

        # Validate output paths
        if not self.is_safe_output_path(text_file) or not self.is_safe_output_path(info_file):
            raise ValueError("Invalid output file path")

        # Save full text
        with open(text_file, 'w', encoding='utf-8') as f:
            f.write(f"Extracted from: {filename}\n")
            f.write(f"Extraction time: {datetime.now()}\n")
            f.write("=" * 50 + "\n\n")
            f.write(text)

        # Save metadata and analysis
        combined_info = {
            'metadata': metadata,
            'analysis': analysis,
            'source_file': filename
        }

        with open(info_file, 'w', encoding='utf-8') as f:
            json.dump(combined_info, f, indent=2, ensure_ascii=False)

        return text_file, info_file
    
    def process_pdf(self, pdf_path):
        """Complete processing pipeline for a PDF"""
        # Validate file path first
        if not self.is_safe_path(pdf_path):
            print(f"Invalid or unsafe file path: {pdf_path}")
            return None

        if not os.path.exists(pdf_path):
            print(f"File not found: {pdf_path}")
            return None

        filename = os.path.basename(pdf_path)
        print(f"\nProcessing: {filename}")
        
        # Extract text
        text, metadata = self.extract_from_pdf(pdf_path)
        
        if not text.strip():
            print(f"No text could be extracted from {filename}")
            return None
            
        # Analyze content
        analysis, key_sections = self.analyze_content(text, filename)
        
        # Save to files
        text_file, info_file = self.save_extracted_data(filename, text, metadata, analysis)
        
        # Store in memory
        self.extracted_data[filename] = {
            'text': text,
            'metadata': metadata,
            'analysis': analysis,
            'key_sections': key_sections,
            'files': {'text': text_file, 'info': info_file}
        }
        
        print(f"✓ Extracted {analysis['word_count']} words from {analysis['line_count']} lines")
        print(f"✓ Saved to: {text_file} and {info_file}")
        
        return self.extracted_data[filename]


def main():
    """Main function to process all PDFs in current directory"""
    extractor = PDFExtractor()
    
    # Find all PDF files in current directory
    pdf_files = [f for f in os.listdir('.') if f.lower().endswith('.pdf')]
    
    if not pdf_files:
        print("No PDF files found in current directory")
        return
        
    print(f"Found {len(pdf_files)} PDF file(s):")
    for pdf in pdf_files:
        print(f"  - {pdf}")
    
    # Process each PDF
    results = {}
    for pdf_file in pdf_files:
        result = extractor.process_pdf(pdf_file)
        if result:
            results[pdf_file] = result
    
    # Create summary
    summary_file = "extraction_summary.json"
    summary = {
        'extraction_date': datetime.now().isoformat(),
        'total_files_processed': len(results),
        'files': {filename: data['analysis'] for filename, data in results.items()}
    }
    
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Summary saved to: {summary_file}")
    print(f"✓ Processed {len(results)} PDF files successfully")
    
    return results


if __name__ == "__main__":
    main()
