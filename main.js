/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it. If you have received this file from a source other than Adobe,
 * then your use, modification, or distribution of it requires the prior
 * written permission of Adobe.
 **************************************************************************/

// Global object.
const ppro = require("premierepro");

// Call the Premiere Pro API to populate Application Info area.
async function populateProjectInfo() {
  const project = await ppro.Project.getActiveProject();
  if (!project) {
    log("There is no active project found", "red");
  } else {
    log(`Active project: ${project.name}`);
    const sequence = await project.getActiveSequence();
    if (!sequence) {
      log("There is no active sequence found", "red");
    } else {
      log(`Active sequence: ${sequence.name}`);
    }
  }
}

// Function to set 'toto' in the 'tag' field for all selected clips
async function addTagMasterMetadata() {
  try {
    console.log("=== TAG MASTER PLUGIN LOG ===");
    
    log("Getting selected clips...", "green");
    
    const project = await ppro.Project.getActiveProject();
    if (!project) {
      const errorMsg = "No active project found";
      log(errorMsg, "red");
      console.log(errorMsg);
      return;
    }
    log(`Active project: ${project.name}`);
    console.log(`Active project: ${project.name}`);

    const sequence = await project.getActiveSequence();
    if (!sequence) {
      const errorMsg = "No active sequence found";
      log(errorMsg, "red");
      console.log(errorMsg);
      return;
    }
    log(`Active sequence: ${sequence.name}`);
    console.log(`Active sequence: ${sequence.name}`);

    const selection = await sequence.getSelection();
    if (!selection || !selection.getTrackItems) {
      const errorMsg = "No selection found in the sequence";
      log(errorMsg, "red");
      console.log(errorMsg);
      return;
    }
    
    const selectedTrackItems = await selection.getTrackItems();
    if (!selectedTrackItems || selectedTrackItems.length === 0) {
      const errorMsg = "No clips selected in the sequence";
      log(errorMsg, "red");
      console.log(errorMsg);
      return;
    }
    
    log(`\n--- LISTE DES CLIPS SÉLECTIONNÉS ---`, "green");
    console.log(`\n--- LISTE DES CLIPS SÉLECTIONNÉS (${selectedTrackItems.length}) ---`);
    
    // Filter by unique project item ID
    const uniqueClipsMap = new Map();
    
    for (const trackItem of selectedTrackItems) {
      const projectItem = await trackItem.getProjectItem();
      if (!projectItem) continue;
      
      const clipName = projectItem.name || trackItem.name || "Unnamed clip";
      let clipId;
      try {
        clipId = await projectItem.getId();
      } catch (idError) {
        clipId = projectItem.id || "Unknown ID";
      }
      
      if (!uniqueClipsMap.has(clipId)) {
        uniqueClipsMap.set(clipId, { name: clipName, id: clipId, projectItem });
      }
    }
    
    const uniqueClips = Array.from(uniqueClipsMap.values());
    
    for (let i = 0; i < uniqueClips.length; i++) {
      const clip = uniqueClips[i];
      const logMsg = `  ${i + 1}. ${clip.name} | ID: ${clip.id}`;
      log(logMsg, "blue");
      console.log(logMsg);
    }
    
    log(`\nTotal: ${uniqueClips.length} clip(s) unique(s)`);
    console.log(`Total: ${uniqueClips.length} clip(s) unique(s)`);
    
    // Set 'toto' in the 'tag' field for ALL selected clips
    if (uniqueClips.length > 0) {
      log(`\n--- Setting 'tag' to 'toto' for all clips ---`, "green");
      console.log(`\n--- Setting 'tag' to 'toto' for all clips ---`);
      
      for (const clip of uniqueClips) {
        if (!clip.projectItem) continue;
        
        log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        console.log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        
        try {
          // First, get the current XMP metadata to preserve existing data
          let currentXmp = await ppro.Metadata.getXMPMetadata(clip.projectItem);
          console.log("Current XMP (first 500 chars):", currentXmp ? currentXmp.substring(0, 500) : "null");
          
          // Create new XMP with 'tag' set to 'toto'
          // Based on your logs, the tag field is: premierePrivateProjectMetaData:tag
          const tagXmp = `<?xpacket begin="" id="W5M0MpCehiHzreSjNc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:premierePrivateProjectMetaData="http://ns.adobe.com/premierePrivateProjectMetaData/1.0/">
      <premierePrivateProjectMetaData:tag>toto</premierePrivateProjectMetaData:tag>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
          
          // Method 1: Try using createSetXMPMetadataAction (this worked in your logs)
          console.log("Trying createSetXMPMetadataAction...");
          const action = await ppro.Metadata.createSetXMPMetadataAction(
            clip.projectItem,
            tagXmp
          );
          
          console.log("Action created:", typeof action, action ? "Action object" : "null");
          
          // In your logs, this method worked (method 2c - auto)
          // So we assume it's auto-executed
          log(`✓ Set 'tag' to 'toto' for ${clip.name}`, "green");
          console.log(`✓ Set 'tag' to 'toto' for ${clip.name}`);
          
          // Verify by getting XMP metadata again
          try {
            const updatedXmp = await ppro.Metadata.getXMPMetadata(clip.projectItem);
            console.log(`Updated XMP for ${clip.name} (first 500 chars):`, updatedXmp ? updatedXmp.substring(0, 500) : "null");
            
            // Check if the tag was set
            if (updatedXmp && updatedXmp.includes('<premierePrivateProjectMetaData:tag>toto</premierePrivateProjectMetaData:tag>')) {
              log(`✓ VERIFIED: 'tag' is now 'toto' for ${clip.name}`, "green");
              console.log(`✓ VERIFIED: 'tag' is now 'toto' for ${clip.name}`);
            } else {
              log(`⚠ Tag may not be set for ${clip.name}`, "orange");
              console.log(`⚠ Tag may not be set for ${clip.name}`);
            }
          } catch (verifyError) {
            console.log(`Could not verify XMP for ${clip.name}: ${verifyError.message}`);
          }
          
        } catch (error) {
          log(`✗ Error with ${clip.name}: ${error.message}`, "red");
          console.log(`✗ Error with ${clip.name}: ${error.message}`);
          if (error.stack) console.log(`Stack: ${error.stack}`);
        }
      }
    }
    
    console.log("\n=== END TAG MASTER PLUGIN LOG ===\n");
    log("\n✅ Done! Check 'tag' column in Project Metadata panel!");
    
  } catch (error) {
    const errorMsg = `Error: ${error.message}`;
    log(errorMsg, "red");
    console.log(errorMsg);
    if (error.stack) {
      log(`Stack: ${error.stack}`, "red");
      console.log(`Stack: ${error.stack}`);
    }
    console.error("Full error:", error);
  }
}

// Event listeners
document.querySelector("#btnPopulate").addEventListener("click", populateProjectInfo);
document.querySelector("#btnAddMetadata").addEventListener("click", addTagMasterMetadata);
document.querySelector("#clear-btn").addEventListener("click", () => {
  document.getElementById("plugin-body").innerHTML = "";
});

function log(msg, color) {
  const pluginBody = document.getElementById("plugin-body");
  pluginBody.innerHTML += color ? `<span style='color:${color}'>${msg}</span><br />` : `${msg}<br />`;
  pluginBody.scrollTop = pluginBody.scrollHeight;
}

function updateTheme(theme) {
  const panelBody = document.getElementById("plugin-body");
  const panelHeading = document.getElementById("plugin-heading");
  if (theme.includes("dark")) {
    panelBody.style.color = "#fff";
    panelHeading.style.color = "#fff";
  } else {
    panelBody.style.color = "#000";
    panelHeading.style.color = "#000";
  }
}

document.theme.onUpdated.addListener((theme) => { updateTheme(theme); });
const currentTheme = document.theme.getCurrent();
updateTheme(currentTheme);
