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

    // Get the selected clips in the sequence
    const selectedClips = await sequence.getSelectedClips();
    if (!selectedClips || selectedClips.length === 0) {
      log("No clips selected in the sequence. Please select a clip.", "red");
      return;
    }
    log(`Found ${selectedClips.length} selected clip(s)`);

    // Process the first selected clip (as per user request)
    const clip = selectedClips[0];
    log(`Processing clip: ${clip.name || 'Unnamed clip'}`);

    // Step 1: Get current project metadata columns
    log("\n--- Step 1: Checking metadata columns ---");
    const metadataColumns = await project.getProjectColumnsMetadata();
    log("Current metadata columns:");
    log(JSON.stringify(metadataColumns, null, 2), "blue");

    // Step 2: Check if 'tag-master' column already exists
    const tagMasterExists = metadataColumns.some(col => col.name === "tag-master");
    
    if (!tagMasterExists) {
      // Step 3: Add the 'tag-master' column if it doesn't exist
      log("\n--- Step 2: Adding 'tag-master' column ---");
      const newMetadataColumns = [...metadataColumns, {
        name: "tag-master",
        type: "text",
        displayName: "Tag Master",
        isCustom: true
      }];
      
      // Update the project metadata columns
      await project.setProjectColumnsMetadata(newMetadataColumns);
      log("Successfully added 'tag-master' metadata column", "green");
      
      // Refresh the metadata columns to confirm
      const updatedColumns = await project.getProjectColumnsMetadata();
      log("Updated metadata columns:");
      log(JSON.stringify(updatedColumns, null, 2), "blue");
    } else {
      log("'tag-master' column already exists", "blue");
    }

    // Step 4: Set the 'tag-master' value for the selected clip
    log("\n--- Step 3: Setting 'tag-master' value for clip ---");
    
    // Get the clip's project item (needed to access metadata)
    const projectItem = await clip.getProjectItem();
    if (!projectItem) {
      log("Could not get project item for the clip", "red");
      return;
    }
    
    log(`Clip project item ID: ${projectItem.id}`);
    
    // Get current metadata for the project item
    const currentMetadata = await projectItem.getMetadata();
    log("Current clip metadata:");
    log(JSON.stringify(currentMetadata, null, 2), "blue");
    
    // Set the 'tag-master' value
    const newMetadata = {
      ...currentMetadata,
      "tag-master": "toto"
    };
    
    // Update the metadata
    await projectItem.setMetadata(newMetadata);
    log("Successfully set 'tag-master' to 'toto' for the clip", "green");
    
    // Verify the metadata was set
    const updatedMetadata = await projectItem.getMetadata();
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
