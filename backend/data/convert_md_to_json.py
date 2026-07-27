#!/usr/bin/env python3
"""
Convert the extracted markdown of اللائحة التنفيذية لنظام العمل وملحقاتها
into the same JSON format as law_articles_index.json
"""

import json
import re

def parse_executive_regulations(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    
    articles = []
    current_section = ""
    current_chapter = ""
    current_appendix = ""
    
    # Track sections/chapters/appendices
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Detect appendix headers - various formats
        # Format 1: "# ملحق رقم(X)" or "ملحق رقم(X)"
        if line.startswith('# ملحق رقم') or line.startswith('ملحق رقم'):
            appendix_match = re.search(r'ملحق رقم\s*\(?(\d+)\)?', line)
            if appendix_match:
                current_appendix = f"ملحق رقم ({appendix_match.group(1)})"
                current_chapter = ""
                current_section = ""
            i += 1
            continue
        
        # Format 2: "# (X)" followed by "ملحق" on next lines (split header)
        if re.match(r'^#\s*\((\d+)\)\s*$', line):
            num_match = re.match(r'^#\s*\((\d+)\)\s*$', line)
            if num_match:
                # Look ahead for "ملحق" keyword
                lookahead = ""
                for j in range(i+1, min(i+4, len(lines))):
                    lookahead += lines[j].strip() + " "
                if 'ملحق' in lookahead or 'رقم' in lookahead:
                    current_appendix = f"ملحق رقم ({num_match.group(1)})"
                    current_chapter = ""
                    current_section = ""
                    # Skip the next few lines that are part of the header
                    i += 1
                    while i < len(lines) and not lines[i].strip().startswith('المادة') and not re.match(r'^الباب', lines[i].strip()):
                        if lines[i].strip().startswith('# ') or lines[i].strip().startswith('## '):
                            i += 1
                            continue
                        if lines[i].strip() == '':
                            i += 1
                            continue
                        # If it's a descriptive line (title of the appendix), skip
                        if len(lines[i].strip()) < 100 and not lines[i].strip().startswith('.'):
                            i += 1
                            continue
                        break
                    continue
            i += 1
            continue
        
        # Detect "ملحق" standalone line that follows a number header
        if line == 'ملحق' or line == '# ':
            i += 1
            continue
        
        # Detect main header
        if line == '# اللائحة التنفيذية':
            current_appendix = "اللائحة التنفيذية"
            current_chapter = ""
            current_section = ""
            i += 1
            continue
        
        # Detect باب (chapter)
        bab_match = re.search(r'الباب\s+(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)[^:]*:?\s*(.*)', line)
        if bab_match and not line.startswith('المادة'):
            current_chapter = line.split('المادة')[0].strip() if 'المادة' in line else line.strip()
            # Clean trailing colons
            current_chapter = current_chapter.rstrip(':').strip()
            # If the line also contains an article, don't skip it
            if 'المادة' not in line:
                i += 1
                continue
        
        # Detect فصل (section)
        fasl_match = re.search(r'الفصل\s+(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)', line)
        if fasl_match and not line.startswith('المادة'):
            current_section = line.split('المادة')[0].strip() if 'المادة' in line else line.strip()
            current_section = current_section.rstrip(':').strip()
            if 'المادة' not in line:
                i += 1
                continue
        
        # Detect نموذج (contract templates in appendix 5)
        if line.startswith('## نموذج'):
            current_section = line.replace('## ', '').strip()
            i += 1
            continue
        
        # Detect articles
        article_match = re.match(r'^المادة\s*(.+)', line)
        if article_match:
            # Extract article name/number
            article_header = line
            
            # Collect article text (all lines until next article or section header)
            article_text_lines = []
            
            # Check if the article header itself contains text after the number
            # Pattern: المادة (X) text...
            header_text_match = re.match(r'^(المادة\s*\(?[\d\w\s\u0600-\u06FF]+\)?(?:\s*مكرر(?:\s*\(\d+\))?)?)\s+(.+)', line)
            if header_text_match:
                article_name = header_text_match.group(1).strip()
                remaining_text = header_text_match.group(2).strip()
                if remaining_text and not remaining_text.startswith('في تنفيذ'):
                    article_text_lines.append(remaining_text)
                elif remaining_text:
                    article_text_lines.append(remaining_text)
            else:
                article_name = line.strip()
            
            i += 1
            # Collect subsequent lines as article body
            while i < len(lines):
                next_line = lines[i].strip()
                
                # Stop at next article
                if re.match(r'^المادة\s+', next_line):
                    break
                # Stop at section/chapter headers
                if next_line.startswith('# ') or next_line.startswith('## '):
                    break
                if re.match(r'^الباب\s+(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)', next_line):
                    break
                if re.match(r'^الفصل\s+(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)', next_line):
                    break
                if next_line.startswith('ملحق رقم'):
                    break
                
                # Skip empty lines but include non-empty content
                if next_line:
                    # Skip image references
                    if next_line.startswith('![') or next_line.startswith('<img'):
                        i += 1
                        continue
                    article_text_lines.append(next_line)
                
                i += 1
            
            # Build article text
            article_text = ' '.join(article_text_lines).strip()
            
            # Clean up article name
            article_name = article_name.strip()
            # Remove trailing periods or colons
            article_name = article_name.rstrip('.:').strip()
            
            # Extract article number for sorting
            num_match = re.search(r'\((\d+)\)', article_name)
            if num_match:
                article_num = int(num_match.group(1))
            else:
                # Try to extract Arabic ordinal numbers
                arabic_ordinals = {
                    'الأولى': 1, 'الأول': 1, 'الثانية': 2, 'الثاني': 2,
                    'الثالثة': 3, 'الثالث': 3, 'الرابعة': 4, 'الرابع': 4,
                    'الخامسة': 5, 'الخامس': 5, 'السادسة': 6, 'السادس': 6,
                    'السابعة': 7, 'السابع': 7, 'الثامنة': 8, 'الثامن': 8,
                    'التاسعة': 9, 'التاسع': 9, 'العاشرة': 10, 'العاشر': 10,
                    'الحادية عشرة': 11, 'الحادي عشر': 11,
                    'الثانية عشرة': 12, 'الثاني عشر': 12,
                    'الثالثة عشرة': 13, 'الثالث عشر': 13,
                    'الرابعة عشرة': 14, 'الرابع عشر': 14,
                    'الخامسة عشرة': 15, 'الخامس عشر': 15,
                    'السادسة عشرة': 16, 'السادس عشر': 16,
                    'السابعة عشرة': 17, 'السابع عشر': 17,
                    'الثامنة عشرة': 18, 'الثامن عشر': 18,
                    'التاسعة عشرة': 19, 'التاسع عشر': 19,
                    'العشرون': 20, 'العشرين': 20,
                    'الحادية والعشرون': 21, 'الحادي والعشرون': 21, 'الحادية والعشرين': 21,
                    'الثانية والعشرون': 22, 'الثاني والعشرون': 22, 'الثانية والعشرين': 22,
                    'الثالثة والعشرون': 23, 'الثالث والعشرون': 23, 'الثالثة والعشرين': 23,
                    'الرابعة والعشرون': 24, 'الرابع والعشرون': 24, 'الرابعة والعشرين': 24,
                    'الخامسة والعشرون': 25, 'الخامس والعشرون': 25, 'الخامسة والعشرين': 25,
                    'السادسة والعشرون': 26, 'السادس والعشرون': 26,
                    'السابعة والعشرون': 27, 'السابع والعشرون': 27,
                    'الثامنة والعشرون': 28, 'الثامن والعشرون': 28,
                    'التاسعة والعشرون': 29, 'التاسع والعشرون': 29,
                    'الثلاثون': 30, 'الثلاثين': 30,
                    'الحادية والثلاثون': 31, 'الحادي والثلاثون': 31, 'الحادية والثلاثين': 31,
                    'الثانية والثلاثون': 32, 'الثاني والثلاثون': 32, 'الثانية والثلاثين': 32,
                    'الثالثة والثلاثون': 33, 'الثالث والثلاثون': 33, 'الثالثة والثلاثين': 33,
                    'الرابعة والثلاثون': 34, 'الرابع والثلاثون': 34, 'الرابعة والثلاثين': 34,
                    'الخامسة والثلاثون': 35, 'الخامس والثلاثون': 35, 'الخامسة والثلاثين': 35,
                    'السادسة والثلاثون': 36, 'السادس والثلاثون': 36,
                    'السابعة والثلاثون': 37, 'السابع والثلاثون': 37,
                    'الثامنة والثلاثون': 38, 'الثامن والثلاثون': 38,
                    'التاسعة والثلاثون': 39, 'التاسع والثلاثون': 39,
                    'الأربعون': 40, 'الأربعين': 40,
                    'الحادية والأربعون': 41, 'الحادي والأربعون': 41, 'الحادية والأربعين': 41,
                    'الثانية والأربعون': 42, 'الثاني والأربعون': 42, 'الثانية والأربعين': 42,
                    'الثالثة والأربعون': 43, 'الثالث والأربعون': 43, 'الثالثة والأربعين': 43,
                    'الرابعة والأربعون': 44, 'الرابع والأربعون': 44, 'الرابعة والأربعين': 44,
                    'الخامسة والأربعون': 45, 'الخامس والأربعون': 45, 'الخامسة والأربعين': 45,
                    'السادسة والأربعون': 46, 'السادس والأربعون': 46,
                    'السابعة والأربعون': 47, 'السابع والأربعون': 47,
                    'الثامنة والأربعون': 48, 'الثامن والأربعون': 48,
                    'التاسعة والأربعون': 49, 'التاسع والأربعون': 49,
                    'الخمسون': 50, 'الخمسين': 50,
                    'الحادية والخمسون': 51, 'الحادي والخمسون': 51, 'الحادية والخمسين': 51,
                    'الثانية والخمسون': 52, 'الثاني والخمسون': 52, 'الثانية والخمسين': 52,
                    'الثالثة والخمسون': 53, 'الثالث والخمسون': 53, 'الثالثة والخمسين': 53,
                    'الرابعة والخمسون': 54, 'الرابع والخمسون': 54, 'الرابعة والخمسين': 54,
                    'الخامسة والخمسون': 55, 'الخامس والخمسون': 55, 'الخامسة والخمسين': 55,
                    'السادسة والخمسون': 56, 'السادس والخمسون': 56,
                    'السابعة والخمسون': 57, 'السابع والخمسون': 57,
                    'الثامنة والخمسون': 58, 'الثامن والخمسون': 58,
                    'التاسعة والخمسون': 59, 'التاسع والخمسون': 59,
                    'الستون': 60, 'الستين': 60,
                    'الحادية والستون': 61, 'الحادي والستون': 61, 'الحادية والستين': 61,
                    'الثانية والستون': 62, 'الثاني والستون': 62, 'الثانية والستين': 62,
                    'الثالثة والستون': 63, 'الثالث والستون': 63, 'الثالثة والستين': 63,
                    'الرابعة والستون': 64, 'الرابع والستون': 64, 'الرابعة والستين': 64,
                    'الخامسة والستون': 65, 'الخامس والستون': 65, 'الخامسة والستين': 65,
                    'السادسة والستون': 66, 'السادس والستون': 66,
                    'السابعة والستون': 67, 'السابع والستون': 67,
                    'الثامنة والستون': 68, 'الثامن والستون': 68,
                    'التاسعة والستون': 69, 'التاسع والستون': 69,
                    'السبعون': 70, 'السبعين': 70,
                    'الحادية والسبعون': 71, 'الحادي والسبعون': 71, 'الحادية والسبعين': 71,
                    'الثانية والسبعون': 72, 'الثاني والسبعون': 72, 'الثانية والسبعين': 72,
                }
                found = False
                for ordinal, num in sorted(arabic_ordinals.items(), key=lambda x: -len(x[0])):
                    if ordinal in article_name:
                        article_num = num
                        found = True
                        break
                if not found:
                    article_num = len(articles) + 1
            
            # Determine if cancelled
            cancelled = 'ملغاة' in article_text or 'ملغاة' in article_name
            
            # Generate topic based on content
            topic = generate_topic(article_text, article_name, current_chapter, current_section)
            
            # Determine system name based on appendix
            if current_appendix == "اللائحة التنفيذية":
                system_name = "اللائحة التنفيذية لنظام العمل"
            elif current_appendix:
                system_name = f"اللائحة التنفيذية لنظام العمل - {current_appendix}"
            else:
                system_name = "اللائحة التنفيذية لنظام العمل"
            
            article = {
                "article_number": article_num,
                "article_name": article_name,
                "text": article_text if article_text else "(ملغاة)" if cancelled else "",
                "chapter": current_chapter if current_chapter else current_appendix,
                "section": current_section,
                "cancelled": cancelled,
                "system": system_name,
                "topic": topic
            }
            
            # Check for "مكرر" (repeated/bis articles)
            if 'مكرر' in article_name:
                bis_match = re.search(r'مكرر\s*\((\d+)\)', article_name)
                if bis_match:
                    article["article_number"] = article_num
                # Keep the article number but mark it as bis
            
            articles.append(article)
            continue
        
        i += 1
    
    return articles


def generate_topic(text, article_name, chapter, section):
    """Generate a topic/summary for the article based on its content."""
    
    # Keywords to topic mapping
    topic_keywords = {
        'عقد العمل': 'عقود العمل',
        'عقد عمل': 'عقود العمل',
        'التجربة': 'فترة التجربة',
        'الأجر': 'الأجور',
        'أجور': 'الأجور',
        'الإجازة': 'الإجازات',
        'إجازة': 'الإجازات',
        'ساعات العمل': 'ساعات العمل',
        'العمل الإضافي': 'العمل الإضافي',
        'الراحة الأسبوعية': 'الراحة الأسبوعية',
        'إنهاء العقد': 'إنهاء عقد العمل',
        'فصل': 'إنهاء عقد العمل',
        'مكافأة نهاية': 'مكافأة نهاية الخدمة',
        'التأمين': 'التأمينات',
        'السلامة': 'السلامة المهنية',
        'إصابة عمل': 'إصابات العمل',
        'تشغيل النساء': 'تشغيل النساء',
        'الأحداث': 'تشغيل الأحداث',
        'التدريب': 'التدريب والتأهيل',
        'تأهيل': 'التدريب والتأهيل',
        'المخالفات': 'المخالفات والعقوبات',
        'عقوبة': 'المخالفات والعقوبات',
        'غرامة': 'المخالفات والعقوبات',
        'تفتيش': 'التفتيش',
        'نقل': 'نقل العمال',
        'استقدام': 'الاستقدام',
        'توظيف': 'التوظيف',
        'ترخيص': 'التراخيص',
        'لائحة تنظيم': 'لائحة تنظيم العمل',
        'سجل': 'السجلات والكشوف',
        'كشف': 'السجلات والكشوف',
        'خدمات عمالية': 'الخدمات العمالية',
        'الاستثمار': 'الاستثمار في الاستقدام',
        'المراجعة': 'المراجعة والرقابة',
        'الرقابة': 'المراجعة والرقابة',
        'الضبط': 'الرقابة والضبط',
        'الشكوى': 'الشكاوى',
        'شكاوى': 'الشكاوى',
        'تظلم': 'التظلمات',
        'الترقية': 'الترقيات',
        'تقييم': 'تقييم الأداء',
        'أداء': 'تقييم الأداء',
        'مؤقت': 'العمل المؤقت والعرضي',
        'عرضي': 'العمل المؤقت والعرضي',
        'موسمي': 'العمل الموسمي',
        'إركاب': 'نفقات الإركاب والنقل',
        'بدل سكن': 'البدلات',
        'بدل': 'البدلات',
        'ملغاة': 'مادة ملغاة',
    }
    
    if not text or text == '(ملغاة)':
        return 'مادة ملغاة'
    
    # Check text for keywords
    for keyword, topic in topic_keywords.items():
        if keyword in text[:200]:  # Check first 200 chars
            return topic
    
    # Use section/chapter as fallback
    if section:
        return section
    if chapter:
        return chapter
    
    return 'أحكام عامة'


def main():
    md_path = '/workspace/app/backend/data/updateed اللائحة التنفيذية لنظام العمل وملحقاتها (1)_compressed.md'
    
    articles = parse_executive_regulations(md_path)
    
    print(f"Total articles parsed: {len(articles)}")
    print(f"Sample articles:")
    for a in articles[:3]:
        print(json.dumps(a, ensure_ascii=False, indent=2))
        print('---')
    
    # Check for duplicates based on article_name + system + chapter + section (to preserve articles with same name in different appendices)
    seen = set()
    unique_articles = []
    for a in articles:
        key = f"{a['system']}_{a['chapter']}_{a['section']}_{a['article_name']}"
        if key not in seen:
            seen.add(key)
            unique_articles.append(a)
        else:
            print(f"Duplicate found and removed: {a['article_name']} in {a['chapter']}")
    
    print(f"\nUnique articles: {len(unique_articles)}")
    
    # Write to law_articles_index.json (replacing existing content)
    output_path = '/workspace/app/backend/data/law_articles_index.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(unique_articles, f, ensure_ascii=False, indent=2)
    
    print(f"\nWritten to {output_path}")
    print(f"File size: {len(json.dumps(unique_articles, ensure_ascii=False, indent=2))} chars")


if __name__ == '__main__':
    main()