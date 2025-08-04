
export interface ExamInstructions {
    duration_minutes: number;
    instructions: string[];
}

export async function getExamInstructions(): Promise<ExamInstructions> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is providing exam instructions to students
    // - Return standardized exam instructions
    // - Include duration, timer info, internet connection reminders, etc.
    return Promise.resolve({
        duration_minutes: 30,
        instructions: [
            'Exam duration: 30 minutes',
            'Timer starts immediately upon clicking "Start Exam"',
            'The exam will automatically end when the time expires',
            'Ensure you have a stable internet connection',
            'Save your answers periodically',
            'You can attach files of any type to support your answers',
            'Read each question carefully before answering',
            'Contact your lecturer if you encounter technical issues'
        ]
    });
}
