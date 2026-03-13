import requests

BE_API = "http://localhost:8080/api/user-stories"

class StoryClientService:

    def fetch_story(self, user_story_id: str):

        url = f"{BE_API}/{user_story_id}"

        headers = {
            "x-api-key": "0ddc64ec-8cd6-4397-8e36-69091467e1af"
        }

        response = requests.get(url, headers=headers, timeout=5)

        if response.status_code != 200:
            raise Exception("Failed to fetch story from BE")

        return response.json()