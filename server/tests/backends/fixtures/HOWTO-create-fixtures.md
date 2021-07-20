# How to extract fixtures from existing tests

Add a few snippets to make fixtures from existing tests:

```python
import json

def test_case():
    df = ...
    expected_result = ...
    ...
    
    step = SomeStep(...)
    
    # Extract the test case into a JSON file
    
    with open('../backends/fixtures/<stepname>/<case_name>.json', 'w') as f:
        test_case = {
            'step': step.dict(by_alias=True),
            'input': json.loads(
                df.to_json(
                    orient='table',
                    index=False,
                )
            ),
            'other_inputs': { # Extract other input dataframes (for combinations)
                '<domain_name>': json.loads(
                    other_df.to_json(
                        orient='table',
                        index=False,
                    )
                )
            },
            'expected': json.loads(
                expected_result.to_json(
                    orient='table',
                    index=False,
                )
            ),
        }
        f.write(json.dumps(test_case, indent=2))

```

TODO:
when other backends will be available:
- skip/only for a backend
- specific out file for a backend
