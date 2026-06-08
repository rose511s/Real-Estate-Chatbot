**Real Estate Chatbot** 

**My Approach to the Build:**

Building this chatbot wasn't just about writing code; it was about solving a real-world data puzzle. My job was to act as the "bridge" that stitches all of databases for prices, separate folders for building specs, and external servers for media assets together into a smooth experience for the user.



**My 3-Step Strategy:**

**The Backend "Brain" (Data Normalization):** I started with three separate JSON files (*property\_basics, property\_characteristics, and property\_images*). The biggest challenge was making sure these disconnected files talked to each other. I wrote a function that initializes the server by looping through these datasets, using the property ID as the glue to merge everything into one clean, searchable master list. This makes searching nearly instant for the user.



**The Consultative Chat Flow:** Instead of forcing users to fill out a long, boring form, I wanted it to feel like a real person. I used React’s state management to create a "guided interview." It asks one question at a time—location, budget, bedrooms, and amenities—remembering each piece of info until she has exactly what she needs to perform an accurate search.



**Persistence \& Reliability:** For the "Saved Properties" requirement, I integrated MongoDB so that a user’s choices aren't lost when they refresh their browser. I also built in a "safety net": if a user’s network prevents them from reaching the cloud database, the app automatically switches to a local file-based ledger. This ensures the app is always working.



**The Hurdles I Overcame:**

**Windows Pathing Issues:** Early on, I ran into ENOENT errors because my code couldn't find the data files. I learned that Windows and macOS handle folder paths differently. I resolved this by using Node’s path.join method, which makes the code smart enough to find the files regardless of which computer it’s running on.



**Data Type Mismatches:** I noticed the search wasn't returning results even when the data matched. I realized the chat was sending "500000" as a text string, but the database was looking for a number. I implemented parseInt(..., 10) to safely convert these inputs before the search happens, ensuring the math always works out.



**Asynchronous Lag:** Sometimes the UI felt "laggy" when updating the saved property counter. I resolved this by setting up a specific re-fetch function that triggers immediately after a save, keeping the frontend and backend in perfect sync.





