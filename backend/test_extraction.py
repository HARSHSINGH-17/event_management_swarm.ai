import json
import logging
import sys
from ai.extraction import EventDataExtractor

# Configure logging
logging.basicConfig(level=logging.INFO)

def run_test():
    # Use 'llama2' or 'mistral' based on your local Ollama setup
    extractor = EventDataExtractor(model="llama2")
    
    test_text = """
    TechCon 2024 on March 15-17 at San Francisco.
    Rooms: Grand Ballroom (500), Workshop A (100)
    Day 1: 9:00 AM - Opening Keynote by Dr. Sarah Chen from Google (90 min)
    Speakers: sarah.chen@google.com
    """
    
    # Optional test for multiple inputs
    # test_text = "The AI Safety Summit happens on October 5th, 2024. Main stage area holds 2000. Speaker Elon Musk."
    
    print("=========================================")
    print("Testing Natural Language Data Extraction")
    print("=========================================")
    print(f"Using model: {extractor.model}")
    print("\nINPUT TEXT:")
    print(test_text.strip())
    print("-" * 40)
    
    try:
        result = extractor.extract_from_text(test_text)
        
        print("\nEXTRACTION RESULT (JSON):")
        print(json.dumps(result, indent=2))
        
        if "error" in result:
            print(f"\n[ERROR] {result['error']}")
            if "404" in str(result.get("details", "")):
                print(f"\n[TIP] It looks like the model '{extractor.model}' is not pulled in Ollama.")
                print(f"      Run this in your terminal to download it: ollama run {extractor.model}")
    except Exception as e:
        print(f"\n[FATAL ERROR] Failed to run test script: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_test()
