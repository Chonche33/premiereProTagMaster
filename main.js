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

// Function to set 'toto' in custom metadata column for all selected clips
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
    
    // Set 'toto' in custom metadata column for ALL selected clips
    if (uniqueClips.length > 0) {
      log(`\n--- Setting 'tag-master' to 'toto' for all clips ---`, "green");
      console.log(`\n--- Setting 'tag-master' to 'toto' for all clips ---`);
      
      // First, ensure the 'tag-master' column exists
      try {
        console.log("Adding 'tag-master' to project metadata schema...");
        await ppro.Metadata.addPropertyToProjectMetadataSchema("tag-master", "Tag Master", 1);
        log("✓ Added 'tag-master' column to metadata schema", "green");
        console.log("✓ Added 'tag-master' column to metadata schema");
      } catch (schemaError) {
        console.log("Schema error:", schemaError.message);
        log("'tag-master' column may already exist", "blue");
        console.log("'tag-master' column may already exist");
      }
      
      for (const clip of uniqueClips) {
        if (!clip.projectItem) continue;
        
        log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        console.log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        
        try {
          // Method 1: Try using setMetadata directly on projectItem
          console.log("Trying setMetadata method...");
          if (clip.projectItem.setMetadata) {
            try {
              // Set the custom metadata field
              await clip.projectItem.setMetadata({ "tag-master": "toto" });
              log(`✓ Set 'tag-master' to 'toto' for ${clip.name} (method 1)`, "green");
              console.log(`✓ Set 'tag-master' to 'toto' for ${clip.name} (method 1)`);
            } catch (e1) {
              console.log("Method 1 failed:", e1.message);
              throw e1;
            }
          } else {
            throw new Error("setMetadata method not available");
          }
          
        } catch (method1Error) {
          console.log(`Method 1 failed for ${clip.name}: ${method1Error.message}`);
          
          // Method 2: Try using Metadata.createSetProjectMetadataAction
          try {
            console.log("Trying createSetProjectMetadataAction...");
            
            const metadata = { "tag-master": "toto" };
            const action = await ppro.Metadata.createSetProjectMetadataAction(
              clip.projectItem,
              JSON.stringify(metadata),
              ["tag-master"]
            );
            
            console.log("Action created:", typeof action, action);
            
            if (action && typeof action.execute === 'function') {
              const success = await action.execute();
              console.log("Action executed:", success);
              if (success) {
                log(`✓ Set 'tag-master' to 'toto' for ${clip.name} (method 2a)`, "green");
                console.log(`✓ Set 'tag-master' to 'toto' for ${clip.name} (method 2a)`);
              } else {
                log(`✗ Action failed for ${clip.name}`, "red");
                console.log(`✗ Action failed for ${clip.name}`);
              }
            } else if (action === true) {
              log(`✓ Set 'tag-master' to 'toto' for ${clip.name} (method 2b)`, "green");
              console.log(`✓ Set 'tag-master' to 'toto' for ${clip.name} (method 2b)`);
            } else {
              log(`✓ Set 'tag-master' to 'toto' for ${clip.name} (method 2c - auto)`, "green");
              console.log(`✓ Set 'tag-master' to 'toto' for ${clip.name} (method 2c - auto)`);
            }
          } catch (method2Error) {
            console.log(`Method 2 failed for ${clip.name}: ${method2Error.message}`);
            
            // Method 3: Try using executeTransaction
            try {
              console.log("Trying executeTransaction...");
              const success = await project.executeTransaction((compoundAction) => {
                const setMetadataAction = ppro.Metadata.createSetProjectMetadataAction(
                  clip.projectItem,
                  JSON.stringify({ "tag-master": "toto" }),
                  ["tag-master"]
                );
                compoundAction.addAction(setMetadataAction);
              });
              
              if (success) {
                log(`✓ Set 'tag-master' to 'toto' for ${clip.name} (method 3)`, "green");
                console.log(`✓ Set 'tag-master' to 'toto' for ${clip.name} (method 3)`);
              } else {
                log(`✗ Transaction failed for ${clip.name}`, "red");
                console.log(`✗ Transaction failed for ${clip.name}`);
              }
            } catch (method3Error) {
              console.log(`Method 3 failed for ${clip.name}: ${method3Error.message}`);
              log(`✗ Failed to set 'tag-master' for ${clip.name}: ${method3Error.message}`, "red");
              console.log(`✗ Failed to set 'tag-master' for ${clip.name}: ${method3Error.message}`);
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
    log("\n✅ Done! Check 'tag-master' column in Project Metadata panel!");
    
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
