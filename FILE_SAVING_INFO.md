# File Saving Information

## Browser Security Limitation

Due to browser security restrictions, JavaScript applications running in the browser (like this p5.js application) **cannot directly write files to specific folders on your computer**.

### Where Files Are Saved

When you click "Save Map" or "Export Image":

-   ✅ Files are saved to your **Downloads folder**
-   ❌ Files cannot be automatically saved to the project's `results` folder

This is a security feature that prevents websites from writing files anywhere on your system without permission.

## How to Organize Your Saved Files

### Option 1: Manual Move (Simplest)

1. Click "Save Map" or "Export Image"
2. File downloads to your Downloads folder
3. Manually move/copy the file to:
    ```
    c:\Users\qli\Desktop\IT\2511_Hexagonal_World\results\
    ```

### Option 2: Change Browser Download Location

1. In your browser settings, set the default download location to:
    ```
    c:\Users\qli\Desktop\IT\2511_Hexagonal_World\results\
    ```
2. Now all saves go directly there
3. Remember to change it back when done

### Option 3: PowerShell Script (Automated)

Create a file `move-results.ps1`:

```powershell
# Move JSON files from Downloads to results folder
$downloadsPath = "$env:USERPROFILE\Downloads"
$resultsPath = "c:\Users\qli\Desktop\IT\2511_Hexagonal_World\results"

Get-ChildItem -Path $downloadsPath -Filter "quadmap_*.json" |
    Move-Item -Destination $resultsPath -Force

Get-ChildItem -Path $downloadsPath -Filter "quadmap_*.png" |
    Move-Item -Destination $resultsPath -Force

Write-Host "Files moved to results folder!"
```

Run it after generating maps:

```powershell
.\move-results.ps1
```

## Alternative: Use Node.js Backend

If you need automatic server-side file saving:

### 1. Create a Simple Server

Create `server.js`:

```javascript
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.static("."));

app.post("/save-map", (req, res) => {
    const { filename, data } = req.body;
    const filepath = path.join(__dirname, "results", filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    res.json({ success: true, path: filepath });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
```

### 2. Install Dependencies

```powershell
npm init -y
npm install express
```

### 3. Update sketch.js saveMap()

```javascript
function saveMap() {
    if (!generatedMap) return;

    let filename = `quadmap_seed${params.randomSeed}_ring${
        params.hexRingCount
    }_${Date.now()}.json`;

    // Send to server instead of download
    fetch("/save-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            filename: filename,
            data: generatedMap,
        }),
    })
        .then((r) => r.json())
        .then((result) => {
            alert("Map saved to results folder: " + result.path);
        });
}
```

### 4. Run the Server

```powershell
node server.js
```

### 5. Open in Browser

Navigate to: `http://localhost:3000`

Now files save directly to the results folder!

## Current Behavior

The application now shows an alert when saving:

```
Map saved to Downloads folder as:
quadmap_seed0_ring10_1699999999999.json

To save to project:
Move the file to the 'results' folder in your project directory.
```

This reminds you to move files manually or use one of the automated solutions above.

## Recommended Workflow

**For Quick Testing:**

-   Let files download to Downloads folder
-   Review them there
-   Delete ones you don't need

**For Production/Archiving:**

-   Use Option 2 (change browser download location temporarily)
-   Or use Option 3 (PowerShell script)
-   Or implement the Node.js backend solution

**For Development:**

-   Implement the Node.js backend
-   Automatic saving to correct folder
-   No manual file management needed

---

**Note:** The alert messages added to the application provide guidance for where files are saved and how to organize them.
