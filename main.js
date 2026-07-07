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
  // Get the active project.
  const project = await ppro.Project.getActiveProject();
  if (!project) {
    log("There is no active project found", "red");
  } else {
    log(`Active project: ${project.name}`);
    // Get the active sequence.
    const sequence = await project.getActiveSequence();
    if (!sequence) {
      log("There is no active sequence found", "red");
    } else {
      log(`Active sequence: ${sequence.name}`);
    }
  }
}

// Function to get selected clips and display their names and IDs
async function addTagMasterMetadata() {
  try {
    log("Getting selected clips...", "green");
    
    // Get the active project
    const project = await ppro.Project.getActiveProject();
    if (!project) {
      log("No active project found", "red");
      return;
    }
    log(`Active project: ${project.name}`);

    // Get the active sequence
    const sequence = await project.getActiveSequence();
    if (!sequence) {
      log("No active sequence found", "red");
      return;
    }
    log(`Active sequence: ${sequence.name}`);

    // Get the current selection from the sequence
    const selection = await sequence.getSelection();
    if (!selection || !selection.getTrackItems) {
      log("No selection found in the sequence. Please select a clip.", "red");
      return;
    }
    
    // Get the selected track items (clips)
    const selectedTrackItems = await selection.getTrackItems();
    if (!selectedTrackItems || selectedTrackItems.length === 0) {
      log("No clips selected in the sequence. Please select a clip.", "red");
      return;
    }
    log(`\n--- LISTE DES CLIPS SÉLECTIONNÉS ---`, "green");
    
    // Use a Map to filter by ID (only show each unique ID once)
    const uniqueClipsMap = new Map();
    
    for (const trackItem of selectedTrackItems) {
      const projectItem = await trackItem.getProjectItem();
      
      if (!projectItem) continue;
      
      // Get name
      let clipName = projectItem.name || trackItem.name || "Unnamed clip";
      
      // Get ID using getId() method
      let clipId;
      try {
        clipId = await projectItem.getId();
      } catch (idError) {
        clipId = projectItem.id || "Unknown ID";
      }
      
      // Only add if we haven't seen this ID before
      if (!uniqueClipsMap.has(clipId)) {
        uniqueClipsMap.set(clipId, {
          name: clipName,
          id: clipId,
          projectItem: projectItem,
          trackItem: trackItem
        });
      }
    }
    
    // Convert to array and display
    const uniqueClips = Array.from(uniqueClipsMap.values());
    
    for (let i = 0; i < uniqueClips.length; i++) {
      const clip = uniqueClips[i];
      log(`  ${i + 1}. ${clip.name} | ID: ${clip.id}`, "blue");
    }
    
    log(`\nTotal: ${uniqueClips.length} clip(s) unique(s) sélectionné(s)`);
    
    // If we have clips, try to add "george" metadata column and set value
    if (uniqueClips.length > 0) {
      const firstClip = uniqueClips[0];
      log(`\n--- Processing first clip: ${firstClip.name} ---`);
      
      if (firstClip.projectItem) {
        try {
          // Step 1: Add "george" to project metadata schema
          log("Adding 'george' to project metadata schema...");
          
          // First check current columns
          let metadataColumns = [];
          try {
            metadataColumns = await ppro.Metadata.getProjectColumnsMetadata();
            log("Current metadata columns:", "blue");
            log(JSON.stringify(metadataColumns.map(c => c.name), null, 2), "blue");
          } catch (colsError) {
            log(`Could not get columns: ${colsError.message}`, "orange");
          }
          
          // Check if "george" already exists
          const georgeExists = metadataColumns.some(col => col.name === "george");
          
          if (!georgeExists) {
            // Add "george" property to schema (1 = text type)
            await ppro.Metadata.addPropertyToProjectMetadataSchema("george", "George", 1);
            log("Successfully added 'george' to metadata schema", "green");
          } else {
            log("'george' already exists in metadata schema", "blue");
          }
          
          // Step 2: Set "george" value for the clip
          log("Setting 'george' value for the clip...");
          
          // Get current metadata safely
          let currentMetadata = {};
          try {
            const metadataStr = await ppro.Metadata.getProjectMetadata(firstClip.projectItem);
            if (metadataStr) {
              currentMetadata = JSON.parse(metadataStr);
            }
          } catch (metadataError) {
            log(`Could not get current metadata: ${metadataError.message}`, "orange");
            currentMetadata = {};
          }
          
          log("Current metadata:", "blue");
          log(JSON.stringify(currentMetadata, null, 2), "blue");
          
          // Set george value
          const newMetadata = {
            ...currentMetadata,
            "george": "test"
          };
          
          // Create and execute the set metadata action
          log("Creating metadata action...");
          const setMetadataAction = await ppro.Metadata.createSetProjectMetadataAction(
            firstClip.projectItem,
            JSON.stringify(newMetadata),
            ["george"]
          );
          
          if (!setMetadataAction) {
            log("Failed to create metadata action", "red");
            return;
          }
          
          log("Executing metadata action...");
          const success = await setMetadataAction.execute();
          
          if (success) {
            log("Successfully set 'george' to 'test' for the clip", "green");
            
            // Verify by getting metadata again
            try {
              const updatedMetadataStr = await ppro.Metadata.getProjectMetadata(firstClip.projectItem);
              const updatedMetadata = updatedMetadataStr ? JSON.parse(updatedMetadataStr) : {};
              log("Updated metadata:", "green");
              log(JSON.stringify(updatedMetadata, null, 2), "green");
            } catch (verifyError) {
              log(`Could not verify metadata: ${verifyError.message}`, "orange");
            }
          } else {
            log("Failed to execute metadata action", "red");
          }
          
        } catch (error) {
          log(`Error in metadata process: ${error.message}`, "red");
          if (error.stack) {
            log(`Stack: ${error.stack}`, "red");
          }
        }
      }
    }
    
    log("\n✅ Process completed!");
    
  } catch (error) {
    log(`Error: ${error.message}`, "red");
    if (error.stack) {
      log(`Stack: ${error.stack}`, "red");
    }
    console.error("Full error:", error);
  }
}

// Event listener for the Populate Application Info button.
document
  .querySelector("#btnPopulate")
  .addEventListener("click", populateProjectInfo);

// Event listener for the Add Tag Master Metadata button.
document
  .querySelector("#btnAddMetadata")
  .addEventListener("click", addTagMasterMetadata);

// Event listener for the Clear Application Info button.
document.querySelector("#clear-btn").addEventListener("click", () => {
  document.getElementById("plugin-body").innerHTML = "";
});

// Log function to display messages in the plugin body.
function log(msg, color) {
  const pluginBody = document.getElementById("plugin-body");
  pluginBody.innerHTML += color
    ? `<span style='color:${color}'>${msg}</span><br />`
    : `${msg}<br />`;
  // Auto-scroll to bottom
  pluginBody.scrollTop = pluginBody.scrollHeight;
}

function updateTheme(theme) {
  panelBody = document.getElementById("plugin-body");
  panelHeading = document.getElementById("plugin-heading"); 
  if(theme.includes("dark")) {
    panelBody.style.color = "#fff";
    panelHeading.style.color = "#fff";
  } else {
    panelBody.style.color = "#000";
    panelHeading.style.color = "#000";
  }
}

document.theme.onUpdated.addListener((theme) => {
	updateTheme(theme);
})

const currentTheme = document.theme.getCurrent();
updateTheme(currentTheme);
