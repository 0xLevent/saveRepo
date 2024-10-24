from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pickle
import re
from typing import List
import Levenshtein

class TurkishTextPreprocessor:
    def __init__(self):
        self.curse_words = {
            'orospu': ['orospu', 'oruspu', 'orusbu', 'orspu', '0r0spu', '0ruspu', 'oruzbu', '0r0zbu', 'or0spu'],
            'götveren': ['gotveren', 'g0tveren', 'göt veren', 'got veren', 'götveren'],
            'amına': ['amina', 'am1na', 'amına', 'amina koyayim', 'amk'],
            'siktir': ['sıktır', 'siktir', 'sigtir', 's1kt1r', 'siktir git', 'sg'],
            'pezevenk': ['pezeveng', 'pezo', 'pzvnk', 'pezeveng'],
            'yarak': ['yarak', 'yarrak', 'yarak kafa'],
            'ananı': ['anani', 'ananı', 'anasını'],
            'piç': ['pic', 'piç', 'pıc', 'pić'],
            'gavat': ['alagavat', 'yarram'],
        }
        self.all_curse_variations = [variation.lower() for variations in self.curse_words.values() for variation in variations]
        self.base_curse_words = list(self.curse_words.keys())
    
    def normalize_curse_words(self, text: str) -> str:
        for base_curse, variations in self.curse_words.items():
            for variation in variations:
                text = re.sub(rf'\b{variation}\b', base_curse, text, flags=re.IGNORECASE)
        return text

    def preprocess(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r'[^a-zçğıöşüA-ZÇĞİÖŞÜ\s]', '', text)
        text = self.normalize_curse_words(text)
        text = ' '.join(text.split())
        return text

class FuzzyProfanityChecker:
    def __init__(self, curse_words: List[str], threshold: float = 0.85):
        self.curse_words = curse_words
        self.threshold = threshold

    def check_profanity(self, text: str) -> bool:
        words = text.split()
        for word in words:
            for curse in self.curse_words:
                if len(word) > 3 and len(curse) > 3:
                    similarity = Levenshtein.ratio(word, curse)
                    if similarity >= self.threshold:
                        return True
        return False

def strict_curse_filter(text: str, base_curse_words: List[str]) -> bool:
    words = text.lower().split()
    return any(curse in words for curse in base_curse_words)

def manual_curse_filter(text: str, preprocessor: TurkishTextPreprocessor, fuzzy_checker: FuzzyProfanityChecker) -> bool:
    preprocessed_text = preprocessor.preprocess(text)
    return (strict_curse_filter(preprocessed_text, preprocessor.base_curse_words) or
            any(curse in preprocessed_text for curse in preprocessor.all_curse_variations) or
            fuzzy_checker.check_profanity(preprocessed_text))

app = Flask(__name__)
CORS(app)

preprocessor = TurkishTextPreprocessor()
fuzzy_checker = FuzzyProfanityChecker(preprocessor.all_curse_variations)

# Load model
with open('model.pkl', 'rb') as model_file:
    pipeline = pickle.load(model_file)

def analyze_text(text: str) -> bool:
    if manual_curse_filter(text, preprocessor, fuzzy_checker):
        return True
    
    preprocessed_text = preprocessor.preprocess(text)
    return bool(pipeline.predict([preprocessed_text])[0])

@app.route('/')
def home():
    return render_template('index.html')


@app.route('/detect', methods=['POST'])
def detect_slang():
    try:
        if request.method == 'POST':
            input_text = request.json.get('content', '')  
            
            if not input_text:
                return jsonify({'error': "Lütfen bir metin girin."}), 400
            
            contains_profanity = analyze_text(input_text)
            
            return jsonify({'contains_slang': contains_profanity})
    
    except Exception as e:
        app.logger.error(f"Bir hata oluştu: {str(e)}")
        return jsonify({'error': f"Bir hata oluştu: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)  


