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

// Global objects.
const ppro = require("premierepro");
const uxp = require("uxp");
const { XMPMeta } = uxp.xmp;

const PPRO_METADATA_URL = "http://ns.adobe.com/premierePrivateProjectMetaData/1.0/";
const DUBLIN_CORE_URL = "http://purl.org/dc/elements/1.1/";

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

// Function to create a new metadata column
async function createNewMetadataColumn() {
  try {
    const newTagName = document.getElementById("new-tag-input").value.trim();
    
    if (!newTagName) {
      log("Please enter a name for the new tag column", "red");
      return;
    }
    
    log(`Creating new metadata column: ${newTagName}...`, "green");
    console.log(`Creating new metadata column: ${newTagName}`);
    
    const project = await ppro.Project.getActiveProject();
    if (!project) {
      log("No active project found", "red");
      return;
    }
    
    // Try to add the property to project metadata schema
    // Type 1 = string/text (based on Adobe documentation)
    try {
      await ppro.Metadata.addPropertyToProjectMetadataSchema(
        newTagName,
        newTagName.charAt(0).toUpperCase() + newTagName.slice(1), // Capitalize first letter for display
        1 // Type: 1 = string/text
      );
      
      log(`✅ Successfully created metadata column: ${newTagName}`, "green");
      console.log(`✅ Successfully created metadata column: ${newTagName}`);
      
      // Clear the input field
      document.getElementById("new-tag-input").value = "";
      
    } catch (error) {
      log(`❌ Failed to create column: ${error.message}`, "red");
      console.log(`❌ Failed to create column: ${error.message}`);
    }
    
  } catch (error) {
    log(`Error: ${error.message}`, "red");
    console.log(`Error: ${error.message}`);
  }
}

// Function to apply tag value to selected clips
async function applyTagToSelectedClips() {
  try {
    const tagValue = document.getElementById("my-tag-input").value.trim();
    const columnName = "newtag"; // Fixed column name as requested
    
    if (!tagValue) {
      log("Please enter a tag value", "red");
      return;
    }
    
    log(`Applying '${tagValue}' to 'newtag' column for selected clips...`, "green");
    console.log(`Applying '${tagValue}' to 'newtag' column for selected clips`);
    
    const project = await ppro.Project.getActiveProject();
    if (!project) {
      log("No active project found", "red");
      return;
    }
    
    const sequence = await project.getActiveSequence();
    if (!sequence) {
      log("No active sequence found", "red");
      return;
    }
    
    // Get selected clips
    const selection = await sequence.getSelection();
    if (!selection || !selection.getTrackItems) {
      log("No selection found in the sequence", "red");
      return;
    }
    
    const selectedTrackItems = await selection.getTrackItems();
    if (!selectedTrackItems || selectedTrackItems.length === 0) {
      log("No clips selected in the sequence", "red");
      return;
    }
    
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
    
    log(`\nFound ${uniqueClips.length} unique clip(s):`, "blue");
    console.log(`Found ${uniqueClips.length} unique clip(s)`);
    
    for (let i = 0; i < uniqueClips.length; i++) {
      const clip = uniqueClips[i];
      log(`  ${i + 1}. ${clip.name} | ID: ${clip.id}`, "blue");
      console.log(`  ${i + 1}. ${clip.name} | ID: ${clip.id}`);
    }
    
    // Apply tag to each clip
    let successCount = 0;
    let failCount = 0;
    
    for (const clip of uniqueClips) {
      if (!clip.projectItem) continue;
      
      try {
        // Get current metadata
        const currentMetadata = await ppro.Metadata.getProjectMetadata(clip.projectItem);
        
        // Create XMPMeta object
        let xmpProject;
        if (currentMetadata) {
          xmpProject = new XMPMeta(currentMetadata);
        } else {
          xmpProject = new XMPMeta();
        }
        
        // Set the newtag property
        xmpProject.setProperty(PPRO_METADATA_URL, columnName, tagValue);
        xmpProject.setProperty(PPRO_METADATA_URL, `Column.PropertyText.${columnName.charAt(0).toUpperCase() + columnName.slice(1)}`, tagValue);
        
        // Serialize to string
        const newXmpStr = xmpProject.serialize();
        
        // Create and execute action
        const updatedFields = [columnName, `Column.PropertyText.${columnName.charAt(0).toUpperCase() + columnName.slice(1)}`];
        const action = await ppro.Metadata.createSetProjectMetadataAction(
          clip.projectItem,
          newXmpStr,
          updatedFields
        );
        
        // Execute the action
        if (action && typeof action.execute === 'function') {
          const success = await action.execute();
          if (success) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          // Action is auto-executed
          successCount++;
        }
        
      } catch (error) {
        log(`❌ Failed to set '${columnName}' for ${clip.name}: ${error.message}`, "red");
        console.log(`❌ Failed to set '${columnName}' for ${clip.name}: ${error.message}`);
        failCount++;
      }
    }
    
    log(`\n✅ Applied '${tagValue}' to ${successCount} clip(s)`, "green");
    log(`❌ Failed for ${failCount} clip(s)`, failCount > 0 ? "red" : "green");
    console.log(`✅ Applied '${tagValue}' to ${successCount} clip(s)`);
    console.log(`❌ Failed for ${failCount} clip(s)`);
    
    // Clear the input field
    document.getElementById("my-tag-input").value = "";
    
  } catch (error) {
    log(`Error: ${error.message}`, "red");
    console.log(`Error: ${error.message}`);
  }
}

// Function to get selected clips and display their names and IDs
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

    // Get selected clips
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
    
    log(`\nTotal: ${uniqueClips.length} clip(s) unique(s)`, "blue");
    console.log(`Total: ${uniqueClips.length} clip(s) unique(s)`);
    
    // Set 'toto' in the 'tag' field for ALL selected clips (original functionality)
    if (uniqueClips.length > 0) {
      log(`\n--- Setting 'tag' to 'toto' for all clips ---`, "green");
      console.log(`\n--- Setting 'tag' to 'toto' for all clips ---`);
      
      for (const clip of uniqueClips) {
        if (!clip.projectItem) continue;
        
        log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        console.log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        
        try {
          // Get current metadata
          const currentMetadata = await ppro.Metadata.getProjectMetadata(clip.projectItem);
          console.log(`Current metadata for ${clip.name}:`, currentMetadata ? "exists" : "null");
          
          // Create XMPMeta object
          let xmpProject;
          if (currentMetadata) {
            xmpProject = new XMPMeta(currentMetadata);
          } else {
            xmpProject = new XMPMeta();
          }
          
          // Set the 'tag' property using the correct namespace
          console.log("Setting tag property...");
          xmpProject.setProperty(PPRO_METADATA_URL, "tag", "toto");
          xmpProject.setProperty(PPRO_METADATA_URL, "Column.PropertyText.Tag", "toto");
          
          // Serialize to string
          const newXmpStr = xmpProject.serialize();
          console.log("New XMP (first 500 chars):", newXmpStr.substring(0, 500));
          
          // Create and execute action
          const updatedFields = ["tag", "Column.PropertyText.Tag"];
          const action = await ppro.Metadata.createSetProjectMetadataAction(
            clip.projectItem,
            newXmpStr,
            updatedFields
          );
          
          console.log("Action created:", typeof action);
          
          // Execute the action
          if (action && typeof action.execute === 'function') {
            const success = await action.execute();
            console.log("Action executed:", success);
            if (success) {
              log(`✅ SUCCESS: 'tag' set to 'toto' for ${clip.name}`, "green");
              console.log(`✅ SUCCESS: 'tag' set to 'toto' for ${clip.name}`);
            } else {
              log(`❌ Action failed for ${clip.name}`, "red");
              console.log(`❌ Action failed for ${clip.name}`);
            }
          } else {
            // Action is auto-executed
            log(`✅ SUCCESS: 'tag' set to 'toto' for ${clip.name} (auto-executed)`, "green");
            console.log(`✅ SUCCESS: 'tag' set to 'toto' for ${clip.name} (auto-executed)`);
          }
          
        } catch (error) {
          log(`❌ FAILED: ${clip.name} - ${error.message}`, "red");
          console.log(`❌ FAILED: ${clip.name} - ${error.message}`);
          if (error.stack) console.log(`Stack: ${error.stack}`);
        }
      }
      
      log(`\n✅ ALL DONE! Check 'tag' column in Project Metadata panel for all ${uniqueClips.length} clips!`, "green");
      console.log(`\n✅ ALL DONE! Check 'tag' column in Project Metadata panel for all ${uniqueClips.length} clips!`);
    }
    
    console.log("\n=== END TAG MASTER PLUGIN LOG ===\n");
    
  } catch (error) {
    const errorMsg = `❌ ERROR: ${error.message}`;
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
document.querySelector("#create-tag-btn").addEventListener("click", createNewMetadataColumn);
document.querySelector("#apply-tag-btn").addEventListener("click", applyTagToSelectedClips);
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

document.theme.onUpdated.addListener((theme) => {
	updateTheme(theme);
});

const currentTheme = document.theme.getCurrent();
updateTheme(currentTheme);
