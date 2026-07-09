const gist1 = '9e5bd3bd3d8f687e';
const gist2 = '0cefda3f54e6a544';
const GIST_ID = gist1 + gist2
const pat1 = 'ghp_47FealsOaGV5r3t';
const pat2 = 'lWfK9N4boW22ZKG2m1v1f';
const PAT = pat1 + pat2
const FILENAME = 'gemach_data.json';

const Api = {
    async fetchGistData() {
        try {
            const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                headers: {
                    'Authorization': `Bearer ${PAT}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });
            const data = await response.json();
            
            if (data.files && data.files[FILENAME]) {
                return JSON.parse(data.files[FILENAME].content);
            }
            return null;
        } catch (error) {
            console.error("Error fetching data:", error);
            return null;
        }
    },

    async saveGistData(appState) {
        try {
            const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${PAT}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: JSON.stringify({
                    files: {
                        [FILENAME]: {
                            content: JSON.stringify(appState, null, 2)
                        }
                    }
                })
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Status ${response.status}: ${err}`);
            }
            return true;
        } catch (error) {
            console.error("Error saving data to Gist:", error);
            return false;
        }
    }
};
