import unittest
from backend.calculator import calculate_emissions

class TestCalculator(unittest.TestCase):
    def test_calculate_emissions(self):
        data = {'buildingName': 'Test Building'}
        result = calculate_emissions(data)
        self.assertIn('message', result)
        self.assertIn('Test Building', result['message'])

if __name__ == '__main__':
    unittest.main()
