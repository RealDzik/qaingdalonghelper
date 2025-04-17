// This file will contain the UI logic for the renderer process.
console.log('Renderer process loaded');

import { AppState, DurabilityRecord, initialState, AppStatus } from './state'; // Import state definitions

// --- LocalStorage Keys and Config ---
const LOCAL_STORAGE_KEY = 'qiangdalong_helper_state';
const MAX_RECORDS_TO_SAVE = 50; // Limit the number of records saved

// --- Global Application State ---
// We'll manage state directly in this simple example.
// For larger apps, consider a state management library.
let appState: AppState = JSON.parse(JSON.stringify(initialState)); // Deep copy initial state

// --- DOM Element References --- 
// Use a structure to hold references for better organization
const uiElements = {
    config: {
        totalDurability: null as HTMLInputElement | null,
        roundDuration: null as HTMLInputElement | null,
        travelTime: null as HTMLInputElement | null,
    },
    status: {
        message: null as HTMLParagraphElement | null,
        error: null as HTMLParagraphElement | null,
    },
    data: {
        enemyAttack: null as HTMLSpanElement | null,
        allyAttack: null as HTMLSpanElement | null,
        currentDurability: null as HTMLSpanElement | null,
        predictedTime: null as HTMLSpanElement | null,
    },
    input: {
        durabilityValue: null as HTMLInputElement | null,
        submitButton: null as HTMLButtonElement | null,
    },
    buttons: {
        calcEnemy: null as HTMLButtonElement | null,
        calcAlly: null as HTMLButtonElement | null,
        predict: null as HTMLButtonElement | null,
        reset: null as HTMLButtonElement | null,
    },
    records: {
        list: null as HTMLUListElement | null,
    }
};

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Debug] DOM fully loaded and parsed');

    // --- Get DOM Elements ---
    uiElements.config.totalDurability = document.getElementById('total-durability') as HTMLInputElement;
    uiElements.config.roundDuration = document.getElementById('round-duration') as HTMLInputElement;
    uiElements.config.travelTime = document.getElementById('travel-time') as HTMLInputElement;
    uiElements.status.message = document.getElementById('status-message') as HTMLParagraphElement;
    uiElements.status.error = document.getElementById('error-message') as HTMLParagraphElement;
    uiElements.data.enemyAttack = document.getElementById('enemy-attack') as HTMLSpanElement;
    uiElements.data.allyAttack = document.getElementById('ally-attack') as HTMLSpanElement;
    uiElements.data.currentDurability = document.getElementById('current-durability-display') as HTMLSpanElement;
    uiElements.data.predictedTime = document.getElementById('predicted-time') as HTMLSpanElement;
    uiElements.input.durabilityValue = document.getElementById('durability-input-value') as HTMLInputElement;
    uiElements.input.submitButton = document.getElementById('submit-durability') as HTMLButtonElement;
    console.log('[Debug] Submit button element:', uiElements.input.submitButton);
    uiElements.buttons.calcEnemy = document.getElementById('btn-calc-enemy') as HTMLButtonElement;
    uiElements.buttons.calcAlly = document.getElementById('btn-calc-ally') as HTMLButtonElement;
    uiElements.buttons.predict = document.getElementById('btn-predict') as HTMLButtonElement;
    uiElements.buttons.reset = document.getElementById('btn-reset') as HTMLButtonElement;
    uiElements.records.list = document.getElementById('records-list') as HTMLUListElement;

    // --- Initial Setup ---
    loadStateFromLocalStorage(); // Load saved state first
    updateUI(); // Then update UI with initial/loaded state

    // --- Event Listeners ---
    if (uiElements.input.submitButton) {
        uiElements.input.submitButton.addEventListener('click', handleAddRecord);
        console.log('[Debug] Click listener added to submit button.');
    } else {
        console.error('[Debug] Could not find submit button to attach listener!');
    }
    uiElements.buttons.calcEnemy?.addEventListener('click', handleCalculateEnemy);
    uiElements.buttons.calcAlly?.addEventListener('click', handleCalculateAlly);
    uiElements.buttons.predict?.addEventListener('click', handlePredict);
    uiElements.buttons.reset?.addEventListener('click', handleReset);

    // Config listeners
    uiElements.config.totalDurability?.addEventListener('change', handleConfigChange);
    uiElements.config.roundDuration?.addEventListener('change', handleConfigChange);
    uiElements.config.travelTime?.addEventListener('change', handleConfigChange);
});

// --- Event Handlers ---
function handleAddRecord() {
    console.log('[Debug] handleAddRecord called.');
    const valueStr = uiElements.input.durabilityValue?.value.trim();
    console.log('[Debug] Input value string:', valueStr);
    if (!uiElements.input.durabilityValue || valueStr === undefined) {
        console.error('[Debug] Durability input element not found or value is undefined.');
        return;
    }
    
    const value = parseInt(valueStr);
    console.log('[Debug] Parsed value:', value);

    if (valueStr === '' || isNaN(value) || value < 0) {
        console.error('[Debug] Invalid input value detected.');
        showError('请输入有效的非负耐久度数字。');
        return; 
    }
    
    clearError();
    console.log('[Debug] Input validated, proceeding to add record.');

    const newRecord: DurabilityRecord = { timestamp: Date.now(), value: value };
    appState.records.push(newRecord);
    appState.records.sort((a, b) => a.timestamp - b.timestamp);

    console.log('[Debug] Record added to state:', newRecord, 'Total:', appState.records.length);

    updateStatusBasedOnRecords(); 
    
    if (appState.status === 'predicting') {
        handlePredict(); 
    }

    uiElements.input.durabilityValue.value = '';
    console.log('[Debug] Calling updateUI after adding record.');
    updateUI(); 
    console.log('[Debug] Calling saveStateToLocalStorage after adding record.');
    saveStateToLocalStorage(); 
}

function handleConfigChange() {
    console.log('Configuration changed');
    const newConfig = {
        totalDurability: parseInt(uiElements.config.totalDurability?.value || '0') || 0,
        roundDurationMinutes: parseInt(uiElements.config.roundDuration?.value || '0') || 0,
        travelTimeMinutes: parseInt(uiElements.config.travelTime?.value || '0') || 0,
    };
    
    // Basic validation
    if (newConfig.totalDurability <= 0 || newConfig.roundDurationMinutes <= 0 || newConfig.travelTimeMinutes < 0) {
        showError('配置值无效（总耐久度和轮次时长必须大于0，行军时间不能为负）。');
        // Revert UI to old values? Or just prevent saving?
        // Let's prevent saving bad config but leave UI as is for user to correct
        return;
    }
    
    clearError();
    appState.config = newConfig;
    console.log('New config:', appState.config);

    // If prediction was active, recalculate
    if (appState.status === 'predicting' || appState.calculated.allyAttackPerRound !== null) {
        handlePredict();
    }
    
    updateUI(); // Reflect potential changes (e.g., if validation reverted)
    saveStateToLocalStorage(); // Save state after config change
}

function handleCalculateEnemy() {
    console.log('Attempting to calculate enemy attack...');
    const enemyAttack = calculateEnemyAttack(appState.records, appState.config.roundDurationMinutes);

    if (enemyAttack !== null) {
        clearError();
        appState.calculated.enemyAttackPerRound = enemyAttack;
        // Decide next state based on record count for ally calculation
        if (appState.records.length >= 5) {
            appState.status = 'ready_for_ally_calc';
        } else {
            appState.status = 'waiting_records_for_ally';
        }
        console.log('Enemy attack calculated:', enemyAttack, 'New status:', appState.status);
    } else {
        showError('计算敌方攻击力失败。请确保至少有3条记录，包括首次下降点，以及之后约5分钟和10分钟的记录点，且时间间隔大致正确。');
        // Keep status as ready_for_enemy_calc or waiting_records_for_enemy
    }
    updateUI();
    saveStateToLocalStorage(); // Save state after calculation attempt
}

function handleCalculateAlly() {
    console.log('Attempting to calculate ally attack...');
    const allyAttack = calculateAllyAttack(
        appState.records, 
        appState.calculated.enemyAttackPerRound, 
        appState.config.roundDurationMinutes
    );

    if (allyAttack !== null) {
        clearError();
        appState.calculated.allyAttackPerRound = allyAttack;
        appState.status = 'ally_calculated'; // Ready to predict
        console.log('Ally attack calculated:', allyAttack, 'New status:', appState.status);
        handlePredict(); // Automatically predict after successful ally calculation
    } else {
        showError('计算我方攻击力失败。请确保敌方攻击力已计算，至少有5条记录，包括首次下降点，以及之后约15分钟和20分钟的记录点，且时间间隔大致正确。');
        // Keep status as ready_for_ally_calc or waiting_records_for_ally
    }
    updateUI();
    saveStateToLocalStorage(); // Save state after calculation attempt
}

function handlePredict() {
    console.log('Attempting to predict...');
    if (appState.records.length === 0) {
        showError('无法预测：没有耐久度记录。');
        updateUI();
        return;
    }
    // Use the latest record for current durability
    const currentDurability = appState.records[appState.records.length - 1].value;
    
    const predictionResult = predictAttackTime(
        currentDurability,
        appState.calculated.enemyAttackPerRound,
        appState.calculated.allyAttackPerRound,
        appState.config.roundDurationMinutes,
        appState.config.travelTimeMinutes
    );

    appState.prediction = predictionResult; // Store both timestamp and message

    if (predictionResult.optimalLaunchTime !== null) {
        // Keep status as predicting if calculation was successful
        appState.status = 'predicting'; 
        clearError(); // Clear previous errors if prediction is now successful
        console.log('Prediction result:', predictionResult);
    } else {
        // If prediction failed, show the message from the result as an error
        // Don't change status from 'predicting' if it was already predicting, just show error.
        // If it wasn't predicting, maybe set to 'error' or keep 'ally_calculated'?
        // Let's keep 'ally_calculated' or 'predicting' and just show the error message.
        showError(predictionResult.message); 
        console.warn('Prediction failed:', predictionResult.message);
    }
    updateUI();
    saveStateToLocalStorage(); // Save state after prediction attempt
}

function handleReset() {
    console.log('Resetting application state...');
    if (confirm('确定要重置所有数据和状态吗？此操作无法撤销。')) { 
        appState = JSON.parse(JSON.stringify(initialState)); // Reset to initial state
        clearError();
        clearLocalStorage(); // Clear saved data
        console.log('State reset and localStorage cleared.');
        updateUI();
    }
}

// --- State Update Functions ---
function updateStatusBasedOnRecords() {
    const recordCount = appState.records.length;
    let statusBefore = appState.status;
    let statusAfter = statusBefore;

    // Determine potential next status based *only* on record count
    if (statusBefore === 'idle' && recordCount >= 1) {
        statusAfter = 'waiting_records_for_enemy';
    } else if (statusBefore === 'waiting_records_for_enemy' && recordCount >= 3) {
        statusAfter = 'ready_for_enemy_calc';
    } else if (statusBefore === 'enemy_calculated' || statusBefore === 'waiting_records_for_ally') {
        if (recordCount >= 5) {
            statusAfter = 'ready_for_ally_calc';
        } else {
            statusAfter = 'waiting_records_for_ally';
        }
    } 
    // Note: Transitions to 'enemy_calculated', 'ally_calculated', 'predicting' 
    // are handled within the respective calculation/prediction handlers.

    if (statusAfter !== statusBefore) {
        console.log(`Status changing from ${statusBefore} to ${statusAfter}`);
        appState.status = statusAfter;
        clearError(); // Clear errors on meaningful status change
    }
}

// --- Calculation Logic ---

/**
 * Finds the record closest to a target timestamp.
 * @param records Sorted list of DurabilityRecord.
 * @param targetTimestamp The target timestamp (ms).
 * @param maxDiffMillis Maximum allowed difference in milliseconds (optional).
 * @returns The closest record or null if none found within maxDiffMillis.
 */
function findRecordNearTime(
    records: DurabilityRecord[], 
    targetTimestamp: number, 
    maxDiffMillis?: number
): DurabilityRecord | null {
    if (records.length === 0) return null;

    let closestRecord: DurabilityRecord | null = null;
    let minDiff = Infinity;

    for (const record of records) {
        const diff = Math.abs(record.timestamp - targetTimestamp);
        if (diff < minDiff) {
            minDiff = diff;
            closestRecord = record;
        }
    }

    if (maxDiffMillis !== undefined && minDiff > maxDiffMillis) {
        return null; // Exceeded maximum allowed difference
    }

    return closestRecord;
}

/**
 * Calculates enemy attack power per round based on durability records.
 * Logic: Uses the drop between ~5 mins and ~10 mins after the *first observed drop*.
 * @param records Sorted list of DurabilityRecord.
 * @param roundDurationMinutes Duration of a round in minutes (from config).
 * @returns Calculated enemy attack per round, or null if calculation is not possible.
 */
function calculateEnemyAttack(
    records: DurabilityRecord[], 
    roundDurationMinutes: number
): number | null {
    // Need at least 3 records: initial/baseline, first drop, ~5min post-drop, ~10min post-drop
    // The document description is a bit ambiguous on the *exact* points.
    // Let's assume the user records: 
    // R0: Initial value (maybe full health)
    // R1: First time durability is seen lower than R0 (Timestamp T0)
    // R2: Recorded approx. 5 mins after T0 (Timestamp T1)
    // R3: Recorded approx. 5 mins after T1 (approx. 10 mins after T0) (Timestamp T2)
    // Enemy attack = R2.value - R3.value

    if (records.length < 3) {
        console.error("Need at least 3 records for enemy calculation.");
        return null; 
    }

    // Find the first actual drop point
    let firstDropIndex = -1;
    for (let i = 1; i < records.length; i++) {
        if (records[i].value < records[i-1].value) {
            firstDropIndex = i;
            break;
        }
    }

    if (firstDropIndex === -1 || firstDropIndex >= records.length - 2) {
        // Cannot find a drop or not enough records after the drop
        console.error("Could not find a valid drop point or not enough records after the drop.");
        return null;
    }

    const firstDropRecord = records[firstDropIndex];
    const firstDropTimestamp = firstDropRecord.timestamp;
    console.log(`First drop detected at index ${firstDropIndex}:`, firstDropRecord);

    // Define target times based on round duration
    const roundDurationMillis = roundDurationMinutes * 60 * 1000;
    const targetTime5Min = firstDropTimestamp + roundDurationMillis;
    const targetTime10Min = firstDropTimestamp + 2 * roundDurationMillis;

    // Allow a tolerance (e.g., +/- 2 minutes) for finding records
    const toleranceMillis = 2 * 60 * 1000; 

    // Find records near the target times, searching *after* the first drop record
    const recordsAfterDrop = records.slice(firstDropIndex + 1);
    const recordNear5Min = findRecordNearTime(recordsAfterDrop, targetTime5Min, toleranceMillis);
    const recordNear10Min = findRecordNearTime(recordsAfterDrop, targetTime10Min, toleranceMillis);

    console.log("Record near 5 min:", recordNear5Min);
    console.log("Record near 10 min:", recordNear10Min);

    if (recordNear5Min && recordNear10Min && recordNear5Min.timestamp < recordNear10Min.timestamp) {
        // Check if the two found records are roughly one round duration apart
        const actualTimeDiffMillis = recordNear10Min.timestamp - recordNear5Min.timestamp;
        if (Math.abs(actualTimeDiffMillis - roundDurationMillis) <= toleranceMillis) {
            const durabilityDrop = recordNear5Min.value - recordNear10Min.value;
            console.log(`Calculated drop: ${recordNear5Min.value} - ${recordNear10Min.value} = ${durabilityDrop}`);
            if (durabilityDrop >= 0) {
                return durabilityDrop;
            } else {
                console.error("Calculated negative drop between 5min and 10min records.");
                return null; // Drop should not be negative
            }
        } else {
            console.error(`Time difference between found 5min/10min records (${(actualTimeDiffMillis / 60000).toFixed(1)} min) is too far from round duration (${roundDurationMinutes} min).`);
            return null;
        }
    } else {
        console.error("Could not find suitable records near 5 and 10 minutes after the first drop within tolerance.");
        return null; // Indicate calculation failed
    }
}

/**
 * Calculates ally attack power per round based on durability records and known enemy attack.
 * Logic: Uses the drop between ~15 mins and ~20 mins after the *first observed drop*,
 *        then subtracts the known enemy contribution.
 * @param records Sorted list of DurabilityRecord.
 * @param enemyAttackPerRound Known enemy attack per round.
 * @param roundDurationMinutes Duration of a round in minutes (from config).
 * @returns Calculated ally attack per round, or null if calculation is not possible.
 */
function calculateAllyAttack(
    records: DurabilityRecord[], 
    enemyAttackPerRound: number | null,
    roundDurationMinutes: number
): number | null {
    // Prerequisite: Enemy attack must be known
    if (enemyAttackPerRound === null || enemyAttackPerRound < 0) {
        console.error("Cannot calculate ally attack: Enemy attack is unknown or invalid.");
        return null;
    }

    // Need at least 5 records for the 15min and 20min post-drop points
    if (records.length < 5) {
        console.error("Need at least 5 records for ally calculation.");
        return null; 
    }

    // Find the first actual drop point (same logic as enemy calculation)
    let firstDropIndex = -1;
    for (let i = 1; i < records.length; i++) {
        if (records[i].value < records[i-1].value) {
            firstDropIndex = i;
            break;
        }
    }

    if (firstDropIndex === -1 || firstDropIndex >= records.length - 2) { // Should technically be >= length-4 for 20min mark
        console.error("Could not find a valid drop point or not enough records after the drop for ally calc.");
        return null;
    }

    const firstDropTimestamp = records[firstDropIndex].timestamp;
    console.log(`First drop detected at index ${firstDropIndex} for ally calc.`);

    // Define target times based on round duration
    const roundDurationMillis = roundDurationMinutes * 60 * 1000;
    const targetTime15Min = firstDropTimestamp + 3 * roundDurationMillis; // 15 mins = 3 rounds
    const targetTime20Min = firstDropTimestamp + 4 * roundDurationMillis; // 20 mins = 4 rounds

    // Allow tolerance
    const toleranceMillis = 2 * 60 * 1000; 

    // Find records near the target times, searching *after* the first drop record
    const recordsAfterDrop = records.slice(firstDropIndex + 1);
    const recordNear15Min = findRecordNearTime(recordsAfterDrop, targetTime15Min, toleranceMillis);
    const recordNear20Min = findRecordNearTime(recordsAfterDrop, targetTime20Min, toleranceMillis);

    console.log("Record near 15 min:", recordNear15Min);
    console.log("Record near 20 min:", recordNear20Min);

    if (recordNear15Min && recordNear20Min && recordNear15Min.timestamp < recordNear20Min.timestamp) {
         // Check if the two found records are roughly one round duration apart
        const actualTimeDiffMillis = recordNear20Min.timestamp - recordNear15Min.timestamp;
        if (Math.abs(actualTimeDiffMillis - roundDurationMillis) <= toleranceMillis) {
            const totalDurabilityDrop = recordNear15Min.value - recordNear20Min.value;
            console.log(`Total drop (15-20min): ${recordNear15Min.value} - ${recordNear20Min.value} = ${totalDurabilityDrop}`);
            
            if (totalDurabilityDrop >= 0) {
                // Subtract enemy contribution
                const allyAttack = totalDurabilityDrop - enemyAttackPerRound;
                console.log(`Ally attack calculated: ${totalDurabilityDrop} - ${enemyAttackPerRound} = ${allyAttack}`);
                if (allyAttack >= 0) {
                    return allyAttack;
                } else {
                    console.error("Calculated negative ally attack after subtracting enemy contribution.");
                    return null; // Ally attack should be non-negative
                }
            } else {
                 console.error("Calculated negative total drop between 15min and 20min records.");
                 return null; // Drop should not be negative
            }
        } else {
             console.error(`Time difference between found 15min/20min records (${(actualTimeDiffMillis / 60000).toFixed(1)} min) is too far from round duration (${roundDurationMinutes} min).`);
             return null;
        }
    } else {
        console.error("Could not find suitable records near 15 and 20 minutes after the first drop within tolerance.");
        return null; // Indicate calculation failed
    }
}

// --- Prediction Logic ---

/**
 * Predicts the optimal time to launch an attack to get the last hit.
 * @param currentDurability The latest recorded durability value.
 * @param enemyAttackPerRound Calculated enemy attack per round.
 * @param allyAttackPerRound Calculated ally attack per round.
 * @param roundDurationMinutes Duration of one round in minutes.
 * @param travelTimeMinutes Ally travel time to target in minutes.
 * @returns An object containing the optimal launch timestamp (ms) or null, and a message.
 */
function predictAttackTime(
  currentDurability: number,
  enemyAttackPerRound: number | null,
  allyAttackPerRound: number | null,
  roundDurationMinutes: number,
  travelTimeMinutes: number
): { optimalLaunchTime: number | null; message: string } {
    // Check prerequisites
    if (enemyAttackPerRound === null || enemyAttackPerRound <= 0) {
        return { optimalLaunchTime: null, message: '预测失败：敌方攻击力无效或未计算。' };
    }
    if (allyAttackPerRound === null || allyAttackPerRound <= 0) {
        return { optimalLaunchTime: null, message: '预测失败：我方攻击力无效或未计算。' };
    }
    if (currentDurability <= 0) {
        return { optimalLaunchTime: null, message: '预测失败：当前耐久度已为0或更低。' };
    }

    const roundDurationMillis = roundDurationMinutes * 60 * 1000;
    const travelTimeMillis = travelTimeMinutes * 60 * 1000;

    let n = 0; // Number of full enemy rounds to wait
    const MAX_ROUNDS = 10000; // Safety break

    while (n <= MAX_ROUNDS) {
        const remainingDurabilityAfterNEnemyRounds = currentDurability - n * enemyAttackPerRound;

        // Case 1: City falls during the nth enemy round (before our attack could land)
        if (remainingDurabilityAfterNEnemyRounds <= 0) {
            console.log(`Prediction fail: City falls during enemy round ${n + 1}`);
            return { optimalLaunchTime: null, message: `预测失败：城池会在第 ${n + 1} 轮敌方攻击中被攻陷。` };
        }

        // Case 2: City falls after our attack lands (during the (n+1)th enemy round interval)
        if (remainingDurabilityAfterNEnemyRounds - allyAttackPerRound <= 0) {
            console.log(`Prediction success: Optimal n = ${n}`);
            // Time from now until the *start* of the (n+1)th enemy round
            const timeUntilEndOfNthRound = n * roundDurationMillis;
            // We need to launch `travelTimeMillis` before our attack lands.
            // Our attack lands *after* the nth enemy round completes, and *during* the (n+1)th interval.
            // Let's assume our attack lands just as the (n+1)th enemy round *would* have hit,
            // effectively taking the kill before them in that interval.
            // So, we need our attack to land at `now + timeUntilEndOfNthRound` (approximately).
            // Therefore, we launch at `now + timeUntilEndOfNthRound - travelTimeMillis`.

            const timeToLaunchMillis = timeUntilEndOfNthRound - travelTimeMillis;

            if (timeToLaunchMillis < -60 * 1000) { // Allow launching slightly in the past (e.g., 1 min) due to calculation delay?
                console.warn(`Prediction warning: Calculated launch time (${(timeToLaunchMillis / 60000).toFixed(1)} min ago) is in the past.`);
                 return { optimalLaunchTime: null, message: `预测失败：计算出的最佳攻击时间点已过。` };
            }

            const optimalLaunchTime = Date.now() + timeToLaunchMillis;
            
            const launchDate = new Date(optimalLaunchTime);
            const landTime = new Date(optimalLaunchTime + travelTimeMillis);
            
            return {
                optimalLaunchTime,
                message: `预测成功！建议在 ${launchDate.toLocaleTimeString()} 发起攻击 (预计 ${landTime.toLocaleTimeString()} 到达).`
            };
        }

        n++; // Try waiting for the next enemy round
    }

    // Safety break hit
    console.error("Prediction failed: Exceeded maximum calculation rounds.");
    return { optimalLaunchTime: null, message: `预测失败：计算轮次过多 (${MAX_ROUNDS})，请检查输入数据。` };
}

// --- UI Update Function ---
function updateUI() {
    console.log('Updating UI for state:', appState.status, appState.calculated, appState.prediction);
    
    // Config Panel
    if (uiElements.config.totalDurability) uiElements.config.totalDurability.value = appState.config.totalDurability.toString();
    if (uiElements.config.roundDuration) uiElements.config.roundDuration.value = appState.config.roundDurationMinutes.toString();
    if (uiElements.config.travelTime) uiElements.config.travelTime.value = appState.config.travelTimeMinutes.toString();

    // Status Message (Implementation in Task 10, basic text for now)
    if (uiElements.status.message) uiElements.status.message.textContent = getStatusMessage(appState.status);
    // Error Message
    if (uiElements.status.error) {
        uiElements.status.error.textContent = appState.errorMessage || '';
        uiElements.status.error.style.display = appState.errorMessage ? 'block' : 'none';
    }

    // Data Display
    if (uiElements.data.enemyAttack) uiElements.data.enemyAttack.textContent = appState.calculated.enemyAttackPerRound?.toString() ?? 'N/A';
    if (uiElements.data.allyAttack) uiElements.data.allyAttack.textContent = appState.calculated.allyAttackPerRound?.toString() ?? 'N/A';
    const currentDurability = appState.records.length > 0 ? appState.records[appState.records.length - 1].value : null;
    if (uiElements.data.currentDurability) uiElements.data.currentDurability.textContent = currentDurability?.toString() ?? 'N/A';
    if (uiElements.data.predictedTime) uiElements.data.predictedTime.textContent = formatPredictedTime(appState.prediction.optimalLaunchTime);
    if (uiElements.data.predictedTime && appState.prediction.optimalLaunchTime === null && appState.prediction.message && (appState.status === 'predicting' || appState.status === 'ally_calculated')) {
        // Show prediction fail message if prediction failed but was expected
        // uiElements.data.predictedTime.textContent = appState.prediction.message; // Or show this in status/error?
    }

    // Records List
    if (uiElements.records.list) { 
        uiElements.records.list.innerHTML = ''; 
        appState.records.forEach(record => {
            const li = document.createElement('li');
            const date = new Date(record.timestamp);
            li.textContent = `${date.toLocaleTimeString()} - ${record.value}`;
            uiElements.records.list?.appendChild(li);
        });
        uiElements.records.list.scrollTop = uiElements.records.list.scrollHeight;
    }

    // Button States
    updateButtonStates();

    // Save state implicitly after every UI update? 
    // Or save only on explicit actions like add record, calc, config change?
    // Let's save on explicit actions for now (added calls in handlers above)
    // saveStateToLocalStorage(); // Removed from here, called in handlers instead
}

function updateButtonStates() {
    const status = appState.status;
    const enemyCalculated = appState.calculated.enemyAttackPerRound !== null;
    const allyCalculated = appState.calculated.allyAttackPerRound !== null;

    if (!uiElements.buttons.calcEnemy || !uiElements.buttons.calcAlly || !uiElements.buttons.predict) return;

    // Enable calcEnemy only when status is ready
    uiElements.buttons.calcEnemy.disabled = status !== 'ready_for_enemy_calc';

    // Enable calcAlly only when status is ready AND enemy is calculated
    uiElements.buttons.calcAlly.disabled = !(status === 'ready_for_ally_calc' && enemyCalculated);

    // Enable predict only when both are calculated (status becomes 'ally_calculated' or 'predicting')
    uiElements.buttons.predict.disabled = !( (status === 'ally_calculated' || status === 'predicting') && enemyCalculated && allyCalculated );
    
    // Reset button is always enabled (handled by confirm dialog)
    if (uiElements.buttons.reset) uiElements.buttons.reset.disabled = false;
}

// --- Helper Functions ---
function formatPredictedTime(timestamp: number | null): string {
    if (timestamp === null) {
        return 'N/A';
    }
    try {
        const date = new Date(timestamp);
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return '无效时间戳';
        }
        return date.toLocaleTimeString(); // Format as HH:MM:SS
    } catch (e) {
        console.error("Error formatting time:", e);
        return '时间格式错误';
    }
}

// Status message function (Refined for Task 10)
function getStatusMessage(status: AppStatus): string {
    const recordsNeededForEnemy = 3; // Example: Initial, Drop+5, Drop+10
    const recordsNeededForAlly = 5;  // Example: Initial, Drop+5, Drop+10, Drop+15, Drop+20
    const currentRecordCount = appState.records.length;

    switch (status) {
        case 'idle': 
            return '欢迎使用！请在上方配置区设置正确的【总耐久度】、【轮次时长】和【行军时间】。然后在城池耐久度首次下降后，在下方输入框记录当前【耐久度】。';
        case 'waiting_records_for_enemy': 
            const enemyRemaining = Math.max(0, recordsNeededForEnemy - currentRecordCount);
            return `已记录 ${currentRecordCount} 条。还需要 ${enemyRemaining} 条记录来计算敌方攻击力（需包含首次下降点，以及之后约 ${appState.config.roundDurationMinutes} 分钟和 ${appState.config.roundDurationMinutes * 2} 分钟的记录点）。`;
        case 'ready_for_enemy_calc': 
            return '记录点足够！请点击【计算敌方攻击力】按钮。';
        case 'enemy_calculated': 
            return '敌方攻击力已计算。请确保【我方器械】已开始攻击目标城池，然后在首次下降约 ${appState.config.roundDurationMinutes * 3} 分钟和 ${appState.config.roundDurationMinutes * 4} 分钟后，记录当时的耐久度。';
        case 'waiting_records_for_ally': 
            const allyRemaining = Math.max(0, recordsNeededForAlly - currentRecordCount);
            return `敌方攻击力已计算。还需要 ${allyRemaining} 条记录来计算我方攻击力（需包含首次下降点，以及之后约 ${appState.config.roundDurationMinutes * 3} 分钟和 ${appState.config.roundDurationMinutes * 4} 分钟的记录点）。`;
        case 'ready_for_ally_calc': 
            return '记录点足够！请点击【计算我方攻击力】按钮。';
        case 'ally_calculated': 
            return '敌我攻击力均已计算！请确保【我方器械已停止攻击】。点击【开始/更新预测】或继续输入当前耐久度以自动更新预测时间。';
        case 'predicting': 
             // Try to provide the prediction message directly if successful
             if (appState.prediction.optimalLaunchTime !== null && appState.prediction.message.startsWith('预测成功')) {
                 return appState.prediction.message + " (持续输入新耐久度可刷新预测)";
             } else {
                 // Otherwise show generic predicting or the error from prediction
                 return `预测中... ${appState.prediction.message || '持续输入当前耐久度以更新预测。'}`;
             }
        case 'error': 
            // The specific error is shown below this message
            return '发生错误！请查看下方红色错误信息，修正后可能需要重置或重新计算。';
        default: 
            // This should not happen if all statuses are handled
            const exhaustiveCheck: never = status; 
            console.warn('Unhandled status in getStatusMessage:', status);
            return '未知状态，请检查控制台日志。';
    }
}

// --- Error Handling ---
function showError(message: string) {
    console.error('Error:', message);
    appState.errorMessage = message;
    if (uiElements.status.error) { // Update UI immediately
        uiElements.status.error.textContent = message;
        uiElements.status.error.style.display = 'block';
    }
}

function clearError() {
    if (appState.errorMessage === null) return; // No error to clear
    console.log('Clearing error message');
    appState.errorMessage = null;
    if (uiElements.status.error) { // Update UI immediately
        uiElements.status.error.textContent = '';
        uiElements.status.error.style.display = 'none';
    }
}

// --- LocalStorage Persistence ---

function saveStateToLocalStorage() {
    try {
        // Only save config and recent records
        const stateToSave = {
            config: appState.config,
            records: appState.records.slice(-MAX_RECORDS_TO_SAVE) // Save only the last N records
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
        console.log('State saved to localStorage');
    } catch (e) {
        console.error('Failed to save state to localStorage:', e);
        // Optionally show error to user?
        showError('无法保存状态到本地存储。');
    }
}

function loadStateFromLocalStorage() {
    try {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            
            // Validate loaded data (simple check for existence)
            if (savedState.config && savedState.records) {
                // Merge loaded config and records into the initial state
                // We overwrite config and records, but keep the default status, calculated, prediction etc.
                appState = {
                    ...initialState, // Start with defaults for status, calculated, etc.
                    config: savedState.config, 
                    records: savedState.records
                };
                console.log('State loaded from localStorage:', appState);
                // Update status based on loaded records
                updateStatusBasedOnRecords(); 
            } else {
                console.warn('Loaded state from localStorage is incomplete, using defaults.');
            }
        } else {
            console.log('No saved state found in localStorage, using defaults.');
        }
    } catch (e) {
        console.error('Failed to load or parse state from localStorage:', e);
        showError('加载本地存储状态失败，将使用默认设置。');
        // Ensure appState is reset to default if loading fails badly
        appState = JSON.parse(JSON.stringify(initialState)); 
    }
}

function clearLocalStorage() {
    try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        console.log('LocalStorage cleared.');
    } catch (e) {
        console.error('Failed to clear localStorage:', e);
        showError('清除本地存储失败。');
    }
} 