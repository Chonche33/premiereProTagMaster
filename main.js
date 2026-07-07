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

// Function to get selected clips and set tag metadata
async function addTagMasterMetadata() {
  try {
    console.log("=== TAG MASTER PLUGIN LOG ===");
    
    log("Getting selected clips...", "green");
    
    // Get the active project
    const project = await ppro.Project.getActiveProject();
    if (!project) {
      log("No active project found", "red");
      console.log("Error: No active project found");
      return;
    }
    log(`Active project: ${project.name}`);
    console.log(`Active project: ${project.name}`);

    // Get the active sequence
    const sequence = await project.getActiveSequence();
    if (!sequence) {
      log("No active sequence found", "red");
      console.log("Error: No active sequence found");
      return;
    }
    log(`Active sequence: ${sequence.name}`);
    console.log(`Active sequence: ${sequence.name}`);

    // Get the current selection from the sequence
    const selection = await sequence.getSelection();
    if (!selection || !selection.getTrackItems) {
      log("No selection found in the sequence. Please select a clip.", "red");
      console.log("Error: No selection found in the sequence");
      return;
    }
    
    // Get the selected track items (clips)
    const selectedTrackItems = await selection.getTrackItems();
    if (!selectedTrackItems || selectedTrackItems.length === 0) {
      log("No clips selected in the sequence. Please select a clip.", "red");
      console.log("Error: No clips selected in the sequence");
      return;
    }
    log(`\n--- LISTE DES CLIPS SÉLECTIONNÉS ---`, "green");
    console.log(`\n--- LISTE DES CLIPS SÉLECTIONNÉS (${selectedTrackItems.length}) ---`);
    
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
      const logMsg = `  ${i + 1}. ${clip.name} | ID: ${clip.id}`;
      log(logMsg, "blue");
      console.log(logMsg);
    }
    
    log(`\nTotal: ${uniqueClips.length} clip(s) unique(s) sélectionné(s)`);
    console.log(`\nTotal: ${uniqueClips.length} clip(s) unique(s) sélectionné(s)`);
    
    // If we have clips, create "george" metadata column and set value
    if (uniqueClips.length > 0) {
      const firstClip = uniqueClips[0];
      log(`\n--- Creating 'george' metadata column for: ${firstClip.name} ---`);
      console.log(`\n--- Creating 'george' metadata column for: ${firstClip.name} ---`);
      
      if (firstClip.projectItem) {
        try {
          // Step 1: Ensure "george" column exists in metadata schema (type 1 = string/text)
          log("Checking if 'george' column exists...");
          console.log("Checking if 'george' column exists...");
          
          let metadataColumns = [];
          try {
            metadataColumns = await ppro.Metadata.getProjectColumnsMetadata();
            console.log("Current metadata columns:", metadataColumns.map(c => c.name));
          } catch (colsError) {
            log(`Could not get columns: ${colsError.message}`, "orange");
            console.log(`Could not get columns: ${colsError.message}`);
          }
          
          const georgeExists = metadataColumns.some(col => col.name === "george");
          
          if (!georgeExists) {
            // Add "george" property to schema (type 1 = string/text)
            log("Adding 'george' to metadata schema...");
            console.log("Adding 'george' to metadata schema (type: text)...");
            await ppro.Metadata.addPropertyToProjectMetadataSchema("george", "George", 1);
            log("Successfully added 'george' to metadata schema", "green");
            console.log("Successfully added 'george' to metadata schema");
          } else {
            log("'george' already exists in metadata schema", "blue");
            console.log("'george' already exists in metadata schema");
          }
          
          // Step 2: Set "george" value for the clip
          log("Setting 'george' value for the clip...");
          console.log("Setting 'george' value for the clip...");
          
          // Get current metadata for the clip
          let currentMetadata = {};
          try {
            const metadataStr = await ppro.Metadata.getProjectMetadata(firstClip.projectItem);
            if (metadataStr && typeof metadataStr === 'string') {
              currentMetadata = JSON.parse(metadataStr);
            } else if (metadataStr && typeof metadataStr === 'object') {
              currentMetadata = metadataStr;
            }
            console.log("Current metadata:", currentMetadata);
          } catch (metadataError) {
            log(`Could not get current metadata: ${metadataError.message}`, "orange");
            console.log(`Could not get current metadata: ${metadataError.message}`);
          }
          
          log("Current metadata:");
          log(JSON.stringify(currentMetadata, null, 2), "blue");
          
          // Set george value
          const newMetadata = {
            ...currentMetadata,
            "george": "test"
          };
          
          log("Setting 'george' to 'test'...");
          console.log("Setting 'george' to 'test'...");
          
          // Create and execute the set metadata action
          const setMetadataAction = await ppro.Metadata.createSetProjectMetadataAction(
            firstClip.projectItem,
            JSON.stringify(newMetadata),
            ["george"]
          );
          
          if (!setMetadataAction) {
            log("Failed to create metadata action", "red");
            console.log("Error: Failed to create metadata action");
          } else {
            const success = await setMetadataAction.execute();
            
            if (success) {
              log("Successfully set 'george' to 'test' for the clip", "green");
              console.log("Successfully set 'george' to 'test' for the clip");
              
              // Verify by getting metadata again
              try {
                const updatedMetadataStr = await ppro.Metadata.getProjectMetadata(firstClip.projectItem);
                let updatedMetadata = {};
                if (updatedMetadataStr && typeof updatedMetadataStr === 'string') {
                  updatedMetadata = JSON.parse(updatedMetadataStr);
                } else if (updatedMetadataStr && typeof updatedMetadataStr === 'object') {
                  updatedMetadata = updatedMetadataStr;
                }
                log("Updated metadata:");
                log(JSON.stringify(updatedMetadata, null, 2), "green");
                console.log("Updated metadata:", updatedMetadata);
              } catch (verifyError) {
                log(`Could not verify metadata: ${verifyError.message}`, "orange");
                console.log(`Could not verify metadata: ${verifyError.message}`);
              }
            } else {
              log("Failed to execute metadata action", "red");
              console.log("Error: Failed to execute metadata action");
            }
          }
          
        } catch (error) {
          log(`Error in metadata process: ${error.message}`, "red");
          console.log(`Error in metadata process: ${error.message}`);
          if (error.stack) {
            log(`Stack: ${error.stack}`, "red");
            console.log(`Stack: ${error.stack}`);
          }
        }
      }
    }
    
    console.log("\n=== END TAG MASTER PLUGIN LOG ===\n");
    log("\n✅ Process completed!");
    
  } catch (error) {
    log(`Error: ${error.message}`, "red");
    console.log(`Error: ${error.message}`);
    if (error.stack) {
      log(`Stack: ${error.stack}`, "red");
      console.log(`Stack: ${error.stack}`);
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
