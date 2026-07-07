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

// Function to get selected clip and add custom metadata
async function addTagMasterMetadata() {
  try {
    log("Starting Tag Master metadata process...", "green");
    
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
    log(`Found ${selectedTrackItems.length} selected track item(s)`);

    // Group track items by project item to handle linked clips (video + audio)
    const projectItemsMap = new Map();
    
    for (const trackItem of selectedTrackItems) {
      const projectItem = await trackItem.getProjectItem();
      if (projectItem) {
        const itemName = projectItem.name || trackItem.name || 'Unnamed clip';
        const itemId = projectItem.id;
        
        // Use the project item ID as key to group linked clips
        if (!projectItemsMap.has(itemId)) {
          projectItemsMap.set(itemId, {
            projectItem: projectItem,
            trackItems: [trackItem],
            name: itemName,
            id: itemId
          });
        } else {
          // Add to existing entry (linked clip)
          const existing = projectItemsMap.get(itemId);
          existing.trackItems.push(trackItem);
        }
      }
    }
    
    // Now filter to get unique clips by name (if same name, keep only one)
    // But if different names, keep all
    const uniqueClipsByName = new Map();
    const finalClips = [];
    
    for (const [id, clipData] of projectItemsMap) {
      const name = clipData.name;
      
      // If we haven't seen this name yet, add it
      if (!uniqueClipsByName.has(name)) {
        uniqueClipsByName.set(name, true);
        finalClips.push(clipData);
      }
      // If we've seen this name, skip it (this handles linked video/audio with same name)
    }
    
    if (finalClips.length === 0) {
      log("No valid clips found from selection", "red");
      return;
    }
    
    // Display all selected clip names and IDs
    log(`\n--- Selected Clips (${finalClips.length}) ---`);
    for (const clipData of finalClips) {
      log(`Clip: ${clipData.name} | ID: ${clipData.id}`, "blue");
    }
    
    // Process the first clip for metadata (as per original request)
    const firstClip = finalClips[0];
    log(`\nProcessing first clip: ${firstClip.name}`);
    log(`Clip ID: ${firstClip.id}`);

    // Step 1: Get current project metadata columns using Metadata class static method
    log("\n--- Step 1: Checking metadata columns ---");
    const metadataColumns = await ppro.Metadata.getProjectColumnsMetadata();
    log("Current metadata columns:");
    log(JSON.stringify(metadataColumns, null, 2), "blue");

    // Step 2: Check if 'tag-master' column already exists
    const tagMasterExists = metadataColumns.some(col => col.name === "tag-master");
    
    if (!tagMasterExists) {
      // Step 3: Add the 'tag-master' column if it doesn't exist
      log("\n--- Step 2: Adding 'tag-master' column ---");
      
      // Try to add property to project metadata schema
      try {
        await ppro.Metadata.addPropertyToProjectMetadataSchema("tag-master", "Tag Master", 1); // 1 = text type
        log("Successfully added 'tag-master' to metadata schema", "green");
      } catch (schemaError) {
        log(`Could not add to schema: ${schemaError.message}`, "orange");
      }
    } else {
      log("'tag-master' column already exists", "blue");
    }

    // Step 4: Set the 'tag-master' value for the selected clip
    log("\n--- Step 3: Setting 'tag-master' value for clip ---");
    
    // Get current metadata for the project item
    const currentMetadata = await ppro.Metadata.getProjectMetadata(firstClip.projectItem);
    log("Current clip metadata:");
    log(JSON.stringify(currentMetadata, null, 2), "blue");
    
    // Prepare the new metadata with tag-master set to "toto"
    const newMetadata = {
      ...currentMetadata,
      "tag-master": "toto"
    };
    
    // Create and execute the set metadata action
    // According to the documentation, createSetProjectMetadataAction takes:
    // - projectItem: ProjectItem
    // - metadata: string (JSON stringified)
    // - updatedFields: string[] (array of field names that were updated)
    try {
      const setMetadataAction = await ppro.Metadata.createSetProjectMetadataAction(
        firstClip.projectItem,
        JSON.stringify(newMetadata),
        ["tag-master"]
      );
      
      // Execute the action
      const success = await setMetadataAction.execute();
      if (success) {
        log("Successfully set 'tag-master' to 'toto' for the clip", "green");
      } else {
        log("Failed to set metadata", "red");
      }
    } catch (actionError) {
      log(`Error creating metadata action: ${actionError.message}`, "orange");
      
      // Alternative approach: try to set metadata directly if action fails
      try {
        // Try using the project item's setMetadata method if available
        if (firstClip.projectItem.setMetadata) {
          await firstClip.projectItem.setMetadata(newMetadata);
          log("Successfully set metadata using direct method", "green");
        } else {
          log("No direct setMetadata method available on ProjectItem", "red");
        }
      } catch (directError) {
        log(`Error setting metadata directly: ${directError.message}`, "red");
      }
    }
    
    // Verify the metadata was set
    const updatedMetadata = await ppro.Metadata.getProjectMetadata(firstClip.projectItem);
    log("\nUpdated clip metadata:");
    log(JSON.stringify(updatedMetadata, null, 2), "green");
    
    log("\n✅ Tag Master metadata process completed successfully!");
    
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
