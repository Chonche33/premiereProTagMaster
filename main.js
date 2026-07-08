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

// Function to get selected clips and display metadata columns
async function addTagMasterMetadata() {
  try {
    console.log("=== TAG MASTER PLUGIN LOG ===");
    
    log("Getting project info...", "green");
    
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

    // Get metadata columns from first clip in project
    log(`\n--- PROJECT METADATA COLUMNS ---`, "green");
    console.log(`\n--- PROJECT METADATA COLUMNS ---`);
    
    try {
      const projectRootItem = await project.getRootItem();
      const projectItems = await projectRootItem.getItems();
      
      if (projectItems && projectItems.length > 0) {
        // Find first ClipProjectItem
        let firstClip = null;
        for (const item of projectItems) {
          if (ppro.ClipProjectItem.cast(item)) {
            firstClip = item;
            break;
          }
        }
        
        if (firstClip) {
          const firstClipMetadata = await ppro.Metadata.getProjectMetadata(firstClip);
          console.log("First clip metadata:", firstClipMetadata);
          
          if (firstClipMetadata) {
            const xmpProject = new XMPMeta(firstClipMetadata);
            
            // Get all properties from PPRO_METADATA_URL namespace
            const properties = xmpProject.getAllProperties(PPRO_METADATA_URL);
            console.log("Properties:", properties);
            
            if (properties && properties.length > 0) {
              log("Available metadata columns:", "blue");
              for (const prop of properties) {
                const propName = prop.path ? prop.path.replace(PPRO_METADATA_URL, "") : prop.name;
                log(`  - ${propName}`, "blue");
                console.log(`  - ${propName}`);
              }
            }
          }
        }
      }
    } catch (colsError) {
      log(`Could not get metadata columns: ${colsError.message}`, "orange");
      console.log(`Could not get metadata columns: ${colsError.message}`);
    }

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
          xmpProject.setProperty(PPRO_METADATA_URL, "Column.PropertyText.Tag", "toto");
          
          // Also try just 'tag' (as seen in your XMP logs)
          xmpProject.setProperty(PPRO_METADATA_URL, "tag", "toto");
          
          // Serialize to string
          const newXmpStr = xmpProject.serialize();
          console.log("New XMP (first 500 chars):", newXmpStr.substring(0, 500));
          
          // Create and execute action
          const updatedFields = ["Column.PropertyText.Tag", "tag"];
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
          
          // Verify
          try {
            const updatedMetadata = await ppro.Metadata.getProjectMetadata(clip.projectItem);
            const updatedXmp = new XMPMeta(updatedMetadata);
            const tagValue = updatedXmp.getProperty(PPRO_METADATA_URL, "tag");
            if (tagValue && tagValue.value === "toto") {
              log(`✅ VERIFIED: 'tag' is now 'toto' for ${clip.name}`, "green");
              console.log(`✅ VERIFIED: 'tag' is now 'toto' for ${clip.name}`);
            } else {
              log(`⚠ Tag value for ${clip.name}: ${tagValue ? tagValue.value : 'not set'}`, "orange");
              console.log(`⚠ Tag value for ${clip.name}: ${tagValue ? tagValue.value : 'not set'}`);
            }
          } catch (verifyError) {
            console.log(`Could not verify for ${clip.name}: ${verifyError.message}`);
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
