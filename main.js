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
    log(`\n--- LISTE DES CLIPS SÉLECTIONNÉS (${selectedTrackItems.length}) ---`, "green");
    
    // Array to store all selected clips with their info
    const selectedClips = [];
    
    // Process each selected track item
    for (let i = 0; i < selectedTrackItems.length; i++) {
      const trackItem = selectedTrackItems[i];
      
      // Get the project item from the track item
      const projectItem = await trackItem.getProjectItem();
      
      // Get name from projectItem or trackItem
      let clipName = "Unnamed clip";
      if (projectItem && projectItem.name) {
        clipName = projectItem.name;
      } else if (trackItem.name) {
        clipName = trackItem.name;
      }
      
      // Get ID using getId() method
      let clipId = "Unknown ID";
      if (projectItem && projectItem.getId) {
        try {
          clipId = await projectItem.getId();
        } catch (idError) {
          clipId = projectItem.id || "Unknown ID";
        }
      } else if (trackItem.getId) {
        try {
          clipId = await trackItem.getId();
        } catch (idError) {
          clipId = trackItem.id || "Unknown ID";
        }
      }
      
      // Store clip info
      selectedClips.push({
        index: i + 1,
        name: clipName,
        id: clipId,
        projectItem: projectItem,
        trackItem: trackItem
      });
      
      // Display clip info
      log(`  ${i + 1}. ${clipName} | ID: ${clipId}`, "blue");
    }
    
    log(`\nTotal: ${selectedClips.length} clip(s) sélectionné(s)`);
    
    // If we have clips, try to set metadata on the first one
    if (selectedClips.length > 0) {
      const firstClip = selectedClips[0];
      log(`\n--- Processing first clip for metadata: ${firstClip.name} ---`);
      
      // Only proceed with metadata if we have a valid projectItem
      if (firstClip.projectItem) {
        try {
          // Step 1: Check if 'tag-master' column exists in metadata schema
          log("Checking metadata schema...");
          const metadataColumns = await ppro.Metadata.getProjectColumnsMetadata();
          const tagMasterExists = metadataColumns.some(col => col.name === "tag-master");
          
          if (!tagMasterExists) {
            log("Adding 'tag-master' to metadata schema...");
            await ppro.Metadata.addPropertyToProjectMetadataSchema("tag-master", "Tag Master", 1);
            log("Successfully added 'tag-master' to metadata schema", "green");
          } else {
            log("'tag-master' already exists in metadata schema", "blue");
          }
          
          // Step 2: Get current metadata for the clip
          const currentMetadata = await ppro.Metadata.getProjectMetadata(firstClip.projectItem);
          log("Current metadata:");
          log(JSON.stringify(currentMetadata, null, 2), "blue");
          
          // Step 3: Set 'tag-master' to 'toto'
          const newMetadata = {
            ...currentMetadata,
            "tag-master": "toto"
          };
          
          // Create and execute the set metadata action
          const setMetadataAction = await ppro.Metadata.createSetProjectMetadataAction(
            firstClip.projectItem,
            JSON.stringify(newMetadata),
            ["tag-master"]
          );
          
          const success = await setMetadataAction.execute();
          if (success) {
            log("Successfully set 'tag-master' to 'toto' for the clip", "green");
            
            // Verify
            const updatedMetadata = await ppro.Metadata.getProjectMetadata(firstClip.projectItem);
            log("Updated metadata:");
            log(JSON.stringify(updatedMetadata, null, 2), "green");
          } else {
            log("Failed to set metadata", "red");
          }
          
        } catch (metadataError) {
          log(`Metadata error: ${metadataError.message}`, "red");
          log(`Stack: ${metadataError.stack}`, "red");
        }
      } else {
        log("No valid projectItem for the first clip, skipping metadata", "orange");
      }
    }
    
    log("\n✅ Process completed!");
    
  } catch (error) {
    log(`Error: ${error.message}`, "red");
    log(`Stack: ${error.stack}`, "red");
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
