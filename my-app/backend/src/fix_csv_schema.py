
import os

# Script to harmonize bets_history.csv to 16 columns
# 1. Update Header
# 2. Append ,,,, to old 12-column rows

NEW_HEADER = "Date,Home,Away,Predicted_Winner,Confidence,Type,Result,Real_Winner,User_Prediction,User_Result,User_Reason,User_Confidence,Home_Rest,Away_Rest,Home_B2B,Away_B2B\n"

def fix_csv():
    # Force absolute path
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    CSV_PATH = os.path.join(BASE_DIR, '..', 'data', 'bets_history.csv')
    
    if not os.path.exists(CSV_PATH):
        print("❌ File not found.")
        return

    print(f"📖 Reading {CSV_PATH}...")
    with open(CSV_PATH, 'r') as f:
        lines = f.readlines()
        
    if not lines:
        print("⚠️ Empty file.")
        return

    print(f"⚙️ Processing {len(lines)} lines...")
    
    new_lines = []
    
    # 1. Process Header
    old_header = lines[0].strip()
    # Check if we need to update header
    if "Home_Rest" not in old_header:
        print("   -> Updating Header")
        new_lines.append(NEW_HEADER)
    else:
        print("   -> Header already up to date")
        new_lines.append(lines[0])

    # 2. Process Rows
    fixed_count = 0
    for i, line in enumerate(lines[1:]):
        clean_line = line.strip()
        if not clean_line: continue
        
        # Count commas to guess column count (naive but sufficient here)
        # 12 columns = 11 commas
        # 16 columns = 15 commas
        commas = clean_line.count(',')
        
        if commas == 11: # Old 12-col format
            new_lines.append(clean_line + ",,,,\n")
            fixed_count += 1
        else:
            new_lines.append(clean_line + "\n")
            
    print(f"🔧 Fixed {fixed_count} old rows.")
    
    # Write back
    with open(CSV_PATH, 'w') as f:
        f.writelines(new_lines)
        
    print("✅ CSV Schema harmonized!")

if __name__ == "__main__":
    fix_csv()
