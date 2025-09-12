#!/usr/bin/env python3
"""Test that duplicate prevention is working after applying the fix."""

import subprocess
import sys
from pathlib import Path

def test_duplicate_prevention():
    """Test that re-running bulk load doesn't create duplicates."""
    print("🧪 Testing duplicate prevention after fix...")

    # Test Mount Abu specifically
    print(f"\n🔄 Running Mount Abu bulk load to test duplicate prevention...")
    try:
        result = subprocess.run([
            sys.executable, "bulk_load_weather.py",
            "--station", "mountabu",
            "--file", "data/mtabu_weather_6months.txt"
        ], capture_output=True, text=True, cwd=Path(__file__).parent)

        if result.returncode == 0:
            print("✅ Bulk load completed successfully")
            print("📝 Output:")
            print(result.stdout)

            # Check if we see "Skipped X duplicate rows" messages
            if "Skipped" in result.stdout and "duplicate rows" in result.stdout:
                print("\n🎉 SUCCESS: Duplicate prevention is working!")
                print("   The script detected and skipped duplicate rows.")
            else:
                print("\n⚠️  WARNING: No duplicate skipping messages found.")
                print("   This might mean duplicates were still created.")

        else:
            print("❌ Bulk load failed")
            print("Error:", result.stderr)
            return False

    except Exception as e:
        print(f"❌ Error running bulk load: {e}")
        return False

    return True

if __name__ == "__main__":
    test_duplicate_prevention()
