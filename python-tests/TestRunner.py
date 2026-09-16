from Tests import Tests

if __name__ == '__main__':
    try:
        Tests.example_assert()
        print('Python TestRunner: SUCCESS')
    except AssertionError as exc:
        print('Python TestRunner: FAILED')
        raise
