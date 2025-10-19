#!/usr/bin/env python3
"""
Test Stage 3: Phrolva Core - Animation Engine
Validates that the React/TypeScript frontend is properly set up
"""

import os
import json
import subprocess
import sys

def check_file_exists(filepath, description):
    """Check if a required file exists"""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description} missing: {filepath}")
        return False

def test_stage3_setup():
    """Test that all Stage 3 components are in place"""
    
    print("\n" + "="*70)
    print("STAGE 3: PHROLVA CORE - VALIDATION TEST")
    print("="*70)
    
    all_good = True
    
    # Check project structure
    print("\n📁 Project Structure:")
    required_files = [
        ("phrolva/package.json", "Package configuration"),
        ("phrolva/tsconfig.json", "TypeScript configuration"),
        ("phrolva/vite.config.ts", "Vite build configuration"),
        ("phrolva/index.html", "HTML template"),
    ]
    
    for filepath, desc in required_files:
        all_good &= check_file_exists(filepath, desc)
    
    # Check React components
    print("\n⚛️ React Components:")
    components = [
        ("phrolva/src/App.tsx", "Main App component"),
        ("phrolva/src/main.tsx", "React entry point"),
        ("phrolva/src/components/AnimationOrchestrator.tsx", "Animation orchestrator"),
        ("phrolva/src/components/AnimatedArray.tsx", "Array visualizer"),
        ("phrolva/src/components/AnimatedGraph.tsx", "Graph visualizer"),
        ("phrolva/src/components/AnimatedString.tsx", "String visualizer"),
        ("phrolva/src/components/PlaybackControls.tsx", "Playback controls"),
        ("phrolva/src/components/CodeDisplay.tsx", "Code display"),
    ]
    
    for filepath, desc in components:
        all_good &= check_file_exists(filepath, desc)
    
    # Check TypeScript types
    print("\n📝 TypeScript Types:")
    types = [
        ("phrolva/src/types/animation.types.ts", "Animation types"),
        ("phrolva/src/stores/animationStore.ts", "State management"),
        ("phrolva/src/styles/GlobalStyles.ts", "Global styles"),
    ]
    
    for filepath, desc in types:
        all_good &= check_file_exists(filepath, desc)
    
    # Check package.json has correct dependencies
    print("\n📦 Dependencies Check:")
    if os.path.exists("phrolva/package.json"):
        with open("phrolva/package.json", "r") as f:
            package = json.load(f)
            
        required_deps = ["react", "react-dom", "d3", "framer-motion", "react-spring", "styled-components"]
        missing_deps = []
        
        for dep in required_deps:
            if dep in package.get("dependencies", {}):
                print(f"  ✅ {dep}")
            else:
                print(f"  ❌ {dep} missing")
                missing_deps.append(dep)
                all_good = False
    
    # Summary
    print("\n" + "="*70)
    if all_good:
        print("🎉 STAGE 3 VALIDATION PASSED!")
        print("✅ All Phrolva components are in place")
        print("\n📋 Component Summary:")
        print("  • AnimationOrchestrator: Main coordinator")
        print("  • AnimatedArray: Spring physics for array animations")
        print("  • AnimatedGraph: Force-directed graph visualization") 
        print("  • AnimatedString: Character-level animations")
        print("  • PlaybackControls: Play, pause, speed controls")
        print("  • State Management: Zustand store for animations")
        print("\n🚀 To run the frontend:")
        print("  1. cd phrolva")
        print("  2. npm install")
        print("  3. npm run dev")
        print("\n⚠️  Note: Frontend needs visualization.json from backend")
    else:
        print("❌ STAGE 3 VALIDATION FAILED")
        print("Some components are missing. Please check the errors above.")
    
    print("="*70)
    
    return all_good

def create_sample_visualization():
    """Create a sample visualization.json for testing"""
    
    sample_data = {
        "metadata": {
            "timestamp": "2024-01-01T00:00:00",
            "code_length": 100,
            "code_lines": 10,
            "variables": ["arr", "i", "j"],
            "data_structures": {
                "arrays": ["arr"],
                "dicts": [],
                "strings": [],
                "numbers": []
            }
        },
        "execution": {
            "total_steps": 47,
            "steps": [
                {
                    "step_number": 1,
                    "line_number": 1,
                    "variables": {"arr": [5, 2, 4, 1, 3]},
                    "stdout": ""
                }
            ]
        },
        "animations": {
            "total_commands": 15,
            "commands": [
                {
                    "type": "COMPARE",
                    "indices": [0, 1],
                    "duration": 300,
                    "values": {}
                },
                {
                    "type": "SWAP",
                    "indices": [0, 1],
                    "duration": 500,
                    "values": {}
                }
            ],
            "duration_ms": 7500
        },
        "visualizer_config": {
            "type": "ArrayAdapter",
            "auto_play": False,
            "speed": 1.0
        }
    }
    
    # Save to phrolva/public for dev server
    os.makedirs("phrolva/public", exist_ok=True)
    with open("phrolva/public/visualization.json", "w") as f:
        json.dump(sample_data, f, indent=2)
    
    print("\n📄 Created sample visualization.json for testing")

if __name__ == "__main__":
    passed = test_stage3_setup()
    
    if passed:
        create_sample_visualization()
        print("\n✨ Stage 3 is ready for testing!")
        print("Run 'cd phrolva && npm install && npm run dev' to start the frontend")
    
    sys.exit(0 if passed else 1)
