#!/usr/bin/env python3
"""
Test script to validate image handling in the agent
"""
import asyncio
import base64
import os
from agent.client import BedrockClientSetup

async def main():
    """Test the multimodal capabilities with a simple image"""
    print("=== Testing Claude Image Handling ===")

    # Create a simple test image or use a sample image
    test_image_path = "test_image.jpg"
    
    # If test image doesn't exist, create a simple one
    if not os.path.exists(test_image_path):
        try:
            print("Creating a test image...")
            # Try to create a simple test image with Pillow if available
            try:
                from PIL import Image
                img = Image.new('RGB', (100, 100), color='red')
                img.save(test_image_path)
                print(f"Created test image at {test_image_path}")
            except ImportError:
                print("PIL not available, using a sample base64 image")
                # Simple 1x1 red pixel JPEG
                sample_image = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q=="
                with open(test_image_path, "wb") as f:
                    f.write(base64.b64decode(sample_image))
                print(f"Created basic test image at {test_image_path}")
        except Exception as e:
            print(f"Error creating test image: {e}")
            return

    # Read the image file as base64
    print("Reading test image...")
    with open(test_image_path, "rb") as f:
        image_bytes = f.read()
        base64_image = base64.b64encode(image_bytes).decode("utf-8")

    # Create a data URI
    print("Creating data URI...")
    data_uri = f"data:image/jpeg;base64,{base64_image}"
    
    # Get the first 50 chars for display
    print(f"Image data URI (first 50 chars): {data_uri[:50]}...")

    # Test the format_image_for_claude function
    print("\nTesting format_image_for_claude...")
    formatted_image = BedrockClientSetup.format_image_for_claude(data_uri)
    
    if formatted_image:
        print(f"✓ Successfully formatted image: {formatted_image['type']}")
        print(f"Source type: {formatted_image.get('source', {}).get('type')}")
        print(f"Media type: {formatted_image.get('source', {}).get('media_type')}")
        data_length = len(formatted_image.get('source', {}).get('data', ''))
        print(f"Data length: {data_length} characters")
    else:
        print("✗ Failed to format image")
        return
    
    # Test creating a multimodal message
    print("\nTesting create_multimodal_message...")
    text_message = "What's in this image?"
    message_parts = BedrockClientSetup.create_multimodal_message(text_message, [data_uri])
    
    if message_parts and len(message_parts) > 1:
        print(f"✓ Successfully created multimodal message with {len(message_parts)} parts")
        for i, part in enumerate(message_parts):
            print(f"Part {i+1} type: {part.get('type')}")
    else:
        print("✗ Failed to create multimodal message")
    
    print("\nTest completed!")

if __name__ == "__main__":
    asyncio.run(main())
