// src/state.ts

// 定义耐久度记录的结构
export interface DurabilityRecord {
    timestamp: number; // Unix timestamp (ms)
    value: number;     // Durability value
}

// 定义应用状态的可能值
export type AppStatus = 
    | 'idle'                     // 初始状态，等待配置或首次输入
    | 'waiting_records_for_enemy' // 等待足够记录计算敌方
    | 'ready_for_enemy_calc'     // 记录足够，可以计算敌方
    | 'enemy_calculated'         // 敌方已计算，等待我方攻击和记录
    | 'waiting_records_for_ally' // 等待足够记录计算我方
    | 'ready_for_ally_calc'      // 记录足够，可以计算我方
    | 'ally_calculated'          // 双方已计算，等待停止攻击并预测
    | 'predicting'               // 正在预测中，持续接收更新
    | 'error';                   // 发生错误

// 定义整个应用的状态结构
export interface AppState {
    records: DurabilityRecord[];
    config: {
        totalDurability: number;
        roundDurationMinutes: number;
        travelTimeMinutes: number;
    };
    calculated: {
        enemyAttackPerRound: number | null;
        allyAttackPerRound: number | null;
    };
    status: AppStatus;
    prediction: {
        optimalLaunchTime: number | null; // Unix timestamp (ms)
        message: string; // 预测结果的消息
    };
    errorMessage: string | null; // 存储错误信息
}

// 定义应用的初始状态
export const initialState: AppState = {
    records: [],
    config: {
        totalDurability: 400000, // 默认值
        roundDurationMinutes: 5,  // 默认值
        travelTimeMinutes: 5,   // 默认值
    },
    calculated: {
        enemyAttackPerRound: null,
        allyAttackPerRound: null,
    },
    status: 'idle',
    prediction: {
        optimalLaunchTime: null,
        message: '尚未预测',
    },
    errorMessage: null,
}; 