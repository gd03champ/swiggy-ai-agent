"""
Runner script for image verification flow test

This script sets up the Python path properly to ensure imports work correctly
regardless of where the script is executed from.

Usage:
    python backend/run_image_test.py
"""
import os
import sys
import asyncio

# Add the project root to the Python path
# This ensures imports work correctly regardless of where this is run from
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Now we can import the test module
from backend.test_agent_image_flow import test_refund_image_flow

if __name__ == "__main__":
    print("Starting image verification flow test...")
    asyncio.run(test_refund_image_flow())
    print("Test complete.")
