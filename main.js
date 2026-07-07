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
    
    // If we have clips, set "toto" in the "tag" metadata column
    if (uniqueClips.length > 0) {
      const firstClip = uniqueClips[0];
      log(`\n--- Setting 'tag' to 'toto' for: ${firstClip.name} ---`);
      
      if (firstClip.projectItem) {
        try {
          // Step 1: Ensure "tag" column exists in metadata schema
          log("Checking if 'tag' column exists...");
          
          let metadataColumns = [];
          try {
            metadataColumns = await ppro.Metadata.getProjectColumnsMetadata();
          } catch (colsError) {
            log(`Could not get columns: ${colsError.message}`, "orange");
          }
          
          const tagExists = metadataColumns.some(col => col.name === "tag");
          
          if (!tagExists) {
            // Add "tag" property to schema
            // Type 1 = string/text (according to Adobe docs)
            log("Adding 'tag' to metadata schema...");
            await ppro.Metadata.addPropertyToProjectMetadataSchema("tag", "Tag", 1);
            log("Successfully added 'tag' to metadata schema", "green");
          } else {
            log("'tag' already exists in metadata schema", "blue");
          }
          
          // Step 2: Get current metadata for the clip
          log("Getting current metadata...");
          let currentMetadata = {};
          try {
            const metadataStr = await ppro.Metadata.getProjectMetadata(firstClip.projectItem);
            if (metadataStr && typeof metadataStr === 'string') {
              currentMetadata = JSON.parse(metadataStr);
            } else if (metadataStr && typeof metadataStr === 'object') {
              currentMetadata = metadataStr;
            }
          } catch (metadataError) {
            log(`Could not get current metadata: ${metadataError.message}`, "orange");
          }
          
          log("Current metadata:");
          log(JSON.stringify(currentMetadata, null, 2), "blue");
          
          // Step 3: Set "tag" to "toto"
          const newMetadata = {
            ...currentMetadata,
            "tag": "toto"
          };
          
          log("Setting 'tag' to 'toto'...");
          
          // Create and execute the set metadata action
          const setMetadataAction = await ppro.Metadata.createSetProjectMetadataAction(
            firstClip.projectItem,
            JSON.stringify(newMetadata),
            ["tag"]
          );
          
          if (!setMetadataAction) {
            log("Failed to create metadata action", "red");
          } else {
            const success = await setMetadataAction.execute();
            
            if (success) {
              log("Successfully set 'tag' to 'toto' for the clip", "green");
              
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
              } catch (verifyError) {
                log(`Could not verify metadata: ${verifyError.message}`, "orange");
              }
            } else {
              log("Failed to execute metadata action", "red");
            }
          }
          
          // Step 4: Try to enable the "tag" column in the project panel
          // This might require refreshing the project metadata display
          log("\nRefreshing project metadata display...");
          try {
            // Try to set the project columns metadata to include "tag"
            const updatedColumns = await ppro.Metadata.getProjectColumnsMetadata();
            const tagColumn = updatedColumns.find(col => col.name === "tag");
            if (tagColumn) {
              // Try to enable the column (set visible)
              if (tagColumn.visible !== undefined) {
                tagColumn.visible = true;
              }
              // Try to set the columns back with tag enabled
              if (ppro.Metadata.setProjectColumnsMetadata) {
                await ppro.Metadata.setProjectColumnsMetadata(updatedColumns);
                log("Refreshed metadata columns", "green");
              }
            }
          } catch (refreshError) {
            log(`Could not refresh columns: ${refreshError.message}`, "orange");
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
