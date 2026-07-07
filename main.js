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

// Function to set 'toto' in Dublin Core keywords for all selected clips
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
    
    // Set 'toto' in keywords for ALL selected clips
    if (uniqueClips.length > 0) {
      log(`\n--- Setting keywords to 'toto' for all clips ---`, "green");
      console.log(`\n--- Setting keywords to 'toto' for all clips ---`);
      
      for (const clip of uniqueClips) {
        if (!clip.projectItem) continue;
        
        log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        console.log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        
        try {
          // Method 1: Try using setMetadata directly on projectItem
          console.log("Trying setMetadata method...");
          if (clip.projectItem.setMetadata) {
            // Dublin Core keywords are typically accessed via "keywords" or "dc:subject"
            // Try both formats
            try {
              // Format 1: Simple object with keywords
              await clip.projectItem.setMetadata({ "keywords": "toto" });
              log(`✓ Set keywords to 'toto' for ${clip.name} (method 1a)`, "green");
              console.log(`✓ Set keywords to 'toto' for ${clip.name} (method 1a)`);
            } catch (e1) {
              console.log("Method 1a failed, trying 1b...");
              // Format 2: Array format for keywords
              try {
                await clip.projectItem.setMetadata({ "keywords": ["toto"] });
                log(`✓ Set keywords to 'toto' for ${clip.name} (method 1b)`, "green");
                console.log(`✓ Set keywords to 'toto' for ${clip.name} (method 1b)`);
              } catch (e2) {
                console.log("Method 1b failed, trying 1c...");
                // Format 3: Dublin Core format
                try {
                  await clip.projectItem.setMetadata({ "dc:subject": ["toto"] });
                  log(`✓ Set keywords to 'toto' for ${clip.name} (method 1c)`, "green");
                  console.log(`✓ Set keywords to 'toto' for ${clip.name} (method 1c)`);
                } catch (e3) {
                  console.log("Method 1c failed:", e3.message);
                  throw e3; // Re-throw to try next method
                }
              }
            }
          } else {
            throw new Error("setMetadata method not available");
          }
          
        } catch (method1Error) {
          console.log(`Method 1 failed for ${clip.name}: ${method1Error.message}`);
          
          // Method 2: Try using Metadata.createSetProjectMetadataAction
          try {
            console.log("Trying createSetProjectMetadataAction...");
            
            // For Dublin Core keywords, use the standard schema
            const metadata = { "keywords": "toto" };
            const action = await ppro.Metadata.createSetProjectMetadataAction(
              clip.projectItem,
              JSON.stringify(metadata),
              ["keywords"]
            );
            
            console.log("Action created:", typeof action, action);
            
            // Check what the action returns
            if (action && typeof action.execute === 'function') {
              // If it has execute method, call it
              const success = await action.execute();
              console.log("Action executed:", success);
              if (success) {
                log(`✓ Set keywords to 'toto' for ${clip.name} (method 2a)`, "green");
                console.log(`✓ Set keywords to 'toto' for ${clip.name} (method 2a)`);
              } else {
                log(`✗ Action failed for ${clip.name}`, "red");
                console.log(`✗ Action failed for ${clip.name}`);
              }
            } else if (action === true) {
              // Some actions return true directly
              log(`✓ Set keywords to 'toto' for ${clip.name} (method 2b)`, "green");
              console.log(`✓ Set keywords to 'toto' for ${clip.name} (method 2b)`);
            } else {
              // The action might be auto-executed
              log(`✓ Set keywords to 'toto' for ${clip.name} (method 2c - auto)`, "green");
              console.log(`✓ Set keywords to 'toto' for ${clip.name} (method 2c - auto)`);
            }
          } catch (method2Error) {
            console.log(`Method 2 failed for ${clip.name}: ${method2Error.message}`);
            
            // Method 3: Try using the project's executeTransaction
            try {
              console.log("Trying executeTransaction...");
              const success = await project.executeTransaction((compoundAction) => {
                // This is the recommended way for metadata changes
                const setMetadataAction = ppro.Metadata.createSetProjectMetadataAction(
                  clip.projectItem,
                  JSON.stringify({ "keywords": "toto" }),
                  ["keywords"]
                );
                compoundAction.addAction(setMetadataAction);
              });
              
              if (success) {
                log(`✓ Set keywords to 'toto' for ${clip.name} (method 3)`, "green");
                console.log(`✓ Set keywords to 'toto' for ${clip.name} (method 3)`);
              } else {
                log(`✗ Transaction failed for ${clip.name}`, "red");
                console.log(`✗ Transaction failed for ${clip.name}`);
              }
            } catch (method3Error) {
              console.log(`Method 3 failed for ${clip.name}: ${method3Error.message}`);
              log(`✗ Failed to set keywords for ${clip.name}: ${method3Error.message}`, "red");
              console.log(`✗ Failed to set keywords for ${clip.name}: ${method3Error.message}`);
            }
          }
        }
        
        // Verify the metadata was set
        try {
          const metadata = await ppro.Metadata.getProjectMetadata(clip.projectItem);
          console.log(`Metadata for ${clip.name}:`, metadata);
          log(`Metadata updated for ${clip.name}`, "green");
        } catch (verifyError) {
          console.log(`Could not verify metadata for ${clip.name}: ${verifyError.message}`);
        }
      }
    }
    
    console.log("\n=== END TAG MASTER PLUGIN LOG ===\n");
    log("\n✅ Done!");
    
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
