document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = '/.netlify/functions/server/api'; // Netlify function endpoint prefix

    const uploadSection = document.getElementById('upload');
    const resumeUploadInput = document.getElementById('resumeUpload');
    const uploadContinueBtn = document.querySelector('#upload .continue');
    const uploadCancelBtn = document.querySelector('#upload .cancel');
    const uploadLabel = document.querySelector('.upload-area label');
    let uploadedFile = null;
    let uploadedFileName = '';

    const roleSelectionSection = document.getElementById('role-selection');
    const roleButtonsContainer = document.querySelector('#role-selection .role-buttons'); // To dynamically add buttons
    const interviewSection = document.getElementById('interview-section');
    const currentRoleTitle = document.getElementById('current-role-title');
    const questionDisplay = document.getElementById('question-display');
    const answerInput = document.getElementById('answer-input');
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    const feedbackDisplay = document.getElementById('feedback-display');
    const prevQuestionBtn = document.getElementById('prev-question-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const finishInterviewBtn = document.getElementById('finish-interview-btn');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Loading...';
    document.body.appendChild(loadingIndicator);
    loadingIndicator.style.display = 'none';

    let sessionId = null;
    let selectedRoleKey = null; // Store the key of the selected role
    let currentQuestionNumber = 0; // Tracks question number from API
    let allRoles = {}; // To store roles fetched from API

    // Hide sections initially
    roleSelectionSection.style.display = 'none';
    interviewSection.style.display = 'none';

    // --- Utility Functions ---
    function showLoading() {
        loadingIndicator.style.display = 'flex';
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    function displayMessage(element, message, isError = false) {
        element.textContent = message;
        element.style.color = isError ? 'red' : 'green';
        setTimeout(() => {
            element.textContent = '';
            element.style.color = '';
        }, 5000);
    }

    // --- Resume Upload Logic ---
    resumeUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            uploadedFile = file;
            uploadedFileName = file.name;
            uploadLabel.textContent = `File selected: ${uploadedFileName}`;
            uploadContinueBtn.disabled = false;
        } else {
            uploadedFile = null;
            uploadedFileName = '';
            uploadLabel.textContent = 'Click or drag file to this area to upload (PDF only)';
            displayMessage(uploadLabel, 'Please upload a PDF file.', true);
            uploadContinueBtn.disabled = true;
        }
    });

    uploadContinueBtn.addEventListener('click', async () => {
        if (!uploadedFile) {
            displayMessage(uploadLabel, 'Please select a resume file first.', true);
            return;
        }

        showLoading();
        const formData = new FormData();
        formData.append('resume', uploadedFile);

        try {
            const response = await fetch(`${apiUrl}/upload-resume`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                sessionId = data.sessionId;
                displayMessage(uploadLabel, 'Resume uploaded successfully! Selecting roles...');
                uploadSection.style.display = 'none';
                await fetchRoles(); // Fetch roles after successful upload
                roleSelectionSection.style.display = 'block';
            } else {
                displayMessage(uploadLabel, data.error || 'Failed to upload resume.', true);
            }
        } catch (error) {
            console.error('Error during resume upload:', error);
            displayMessage(uploadLabel, 'Network error or server unavailable.', true);
        } finally {
            hideLoading();
        }
    });

    uploadCancelBtn.addEventListener('click', () => {
        uploadedFile = null;
        uploadedFileName = '';
        resumeUploadInput.value = ''; // Clear file input
        uploadLabel.textContent = 'Click or drag file to this area to upload';
        uploadContinueBtn.disabled = true;
        displayMessage(uploadLabel, 'Upload cancelled.', false);
    });

    // --- Role Selection Logic ---
    async function fetchRoles() {
        showLoading();
        try {
            const response = await fetch(`${apiUrl}/roles`);
            const rolesData = await response.json();

            roleButtonsContainer.innerHTML = ''; // Clear existing buttons
            allRoles = rolesData; // Store roles from API

            for (const roleKey in allRoles) {
                if (allRoles.hasOwnProperty(roleKey)) {
                    const button = document.createElement('button');
                    button.dataset.roleKey = roleKey;
                    button.textContent = allRoles[roleKey].name;
                    button.addEventListener('click', startInterview);
                    roleButtonsContainer.appendChild(button);
                }
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
            displayMessage(roleButtonsContainer, 'Failed to load roles. Please try again later.', true);
        } finally {
            hideLoading();
        }
    }

    async function startInterview(event) {
        selectedRoleKey = event.target.dataset.roleKey;
        if (!sessionId || !selectedRoleKey) {
            displayMessage(interviewSection, 'Error: Session or role not selected.', true);
            return;
        }

        showLoading();
        try {
            const response = await fetch(`${apiUrl}/start-interview`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, roleKey: selectedRoleKey })
            });

            const data = await response.json();

            if (data.success) {
                currentRoleTitle.textContent = `Interview for: ${data.roleName}`;
                questionDisplay.textContent = data.question;
                currentQuestionNumber = 1; // Start from first question
                answerInput.value = ''; // Clear previous answer
                feedbackDisplay.textContent = ''; // Clear previous feedback

                uploadSection.style.display = 'none';
                roleSelectionSection.style.display = 'none';
                interviewSection.style.display = 'block';
                answerInput.style.display = 'block';
                submitAnswerBtn.style.display = 'block';
                prevQuestionBtn.style.display = 'none'; // First question, no previous
                nextQuestionBtn.style.display = 'none'; // Initially, no next question
                finishInterviewBtn.style.display = 'none'; // Not finished yet
            } else {
                displayMessage(interviewSection, data.error || 'Failed to start interview.', true);
            }
        } catch (error) {
            console.error('Error starting interview:', error);
            displayMessage(interviewSection, 'Network error or server unavailable.', true);
        } finally {
            hideLoading();
        }
    }

    // --- Submit Answer Logic ---
    submitAnswerBtn.addEventListener('click', async () => {
        const userAnswer = answerInput.value.trim();
        if (!userAnswer) {
            displayMessage(feedbackDisplay, 'Please type an answer before submitting.', true);
            return;
        }

        if (!sessionId || !selectedRoleKey) {
            displayMessage(interviewSection, 'Error: Session or role not selected.', true);
            return;
        }

        showLoading();
        try {
            const response = await fetch(`${apiUrl}/submit-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, userAnswer })
            });

            const data = await response.json();

            if (data.success) {
                questionDisplay.textContent = data.nextQuestion;
                currentQuestionNumber++;
                answerInput.value = ''; // Clear input for next question
                feedbackDisplay.textContent = ''; // Clear previous feedback

                prevQuestionBtn.style.display = 'inline-block'; // Can always go back after first question
                nextQuestionBtn.style.display = 'none'; // No "next" until we get a new question
                finishInterviewBtn.style.display = 'inline-block'; // Can finish at any point
            } else {
                displayMessage(feedbackDisplay, data.error || 'Failed to submit answer.', true);
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
            displayMessage(feedbackDisplay, 'Network error or server unavailable.', true);
        } finally {
            hideLoading();
        }
    });

    // --- Navigation Buttons (Prev/Next/Finish) ---
    // Note: Previous/Next functionality for AI-generated questions is more complex
    // and would require storing full conversation history on frontend or specific API support.
    // For now, these will be simplified or potentially removed if not supported by backend structure.

    prevQuestionBtn.addEventListener('click', () => {
        displayMessage(feedbackDisplay, 'Previous question navigation is not supported for AI-generated interviews yet.', true);
        // This functionality needs to be carefully implemented with backend support to retrieve previous questions/answers
    });

    nextQuestionBtn.addEventListener('click', () => {
        displayMessage(feedbackDisplay, 'Next question navigation is handled by submitting an answer.', true);
    });

    finishInterviewBtn.addEventListener('click', async () => {
        if (!sessionId || !selectedRoleKey) {
            displayMessage(interviewSection, 'Error: Session or role not selected.', true);
            return;
        }

        showLoading();
        try {
            const response = await fetch(`${apiUrl}/get-feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });

            const data = await response.json();

            if (data.success) {
                let summary = `<h3>Interview Summary for ${allRoles[selectedRoleKey].name}</h3>`;
                summary += `<pre>${data.feedback}</pre>`; // Display raw feedback
                interviewSection.innerHTML = summary; // Replace interview section with summary

                const backToRolesBtn = document.createElement('button');
                backToRolesBtn.textContent = 'Start New Interview';
                backToRolesBtn.onclick = () => {
                    window.location.reload(); // Reload to reset state
                };
                interviewSection.appendChild(backToRolesBtn);
            } else {
                displayMessage(interviewSection, data.error || 'Failed to get feedback.', true);
            }
        } catch (error) {
            console.error('Error getting feedback:', error);
            displayMessage(interviewSection, 'Network error or server unavailable.', true);
        } finally {
            hideLoading();
        }
    });

    // Initialize - ensure correct section is shown on load
    uploadSection.style.display = 'block';
});
