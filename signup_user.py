
import requests
import json

url = "https://qyyhembukflbxjbctuav.supabase.co/auth/v1/signup"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eWhlbWJ1a2ZsYnhqYmN0dWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMzQ1MDQsImV4cCI6MjA4MzkxMDUwNH0.KEJi03-gJfE5g9Y5XFRZRoDsM4ZVpc8qlarqWFyxIEQ",
    "Content-Type": "application/json"
}
data = {
    "email": "usuario.fresco@kyros.com",
    "password": "Prueba123!",
    "data": {
        "nombre": "Usuario Fresco"
    }
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
