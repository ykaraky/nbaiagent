
import pandas as pd
import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILE_PATH = os.path.join(BASE_DIR, '..', 'data', 'bets_history.csv')

def resolve_conflict():
    print("--- RESOLVING BETS_HISTORY.CSV CONFLICT ---")
    
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    cleaned_lines = []
    in_conflict_head = False
    in_conflict_incoming = False
    
    head_block = []
    incoming_block = []
    
    for line in lines:
        if line.startswith('<<<<<<<'):
            in_conflict_head = True
            continue
        if line.startswith('======='):
            in_conflict_head = False
            in_conflict_incoming = True
            continue
        if line.startswith('>>>>>>>'):
            in_conflict_incoming = False
            
            # Now we decide.
            # HEAD usually has the "Cleanest" version of the recent past (since we were working on it)
            # Incoming (Main) has the NEW matches (Jan 25) but arguably duplicates of Jan 19-24.
            
            # Strategy: Keep HEAD. Parse Incoming, find dates > Jan 24 (or whatever HEAD max is) and append.
            # Simpler: Just allow both blocks to be parsed by Pandas and Deduplicate?
            # No, text file might be corrupt.
            
            # Let's clean the lines. We will KEEP HEAD in place.
            # And for Incoming, we will stash them to check what to append.
            
            cleaned_lines.extend(head_block)
            
            # Now parse incoming block lines to see if they are new.
            # A simple rule: If date is Jan 25 (2026-01-25), keep it.
            for inc_line in incoming_block:
                if '2026-01-25' in inc_line: # The new stuff
                    cleaned_lines.append(inc_line)
                    
            head_block = []
            incoming_block = []
            continue
            
        if in_conflict_head:
            head_block.append(line)
        elif in_conflict_incoming:
            incoming_block.append(line)
        else:
            cleaned_lines.append(line)
            
    # Write back
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.writelines(cleaned_lines)
        
    print(f"✅ Conflict resolved. File saved with {len(cleaned_lines)} lines.")

if __name__ == "__main__":
    resolve_conflict()
