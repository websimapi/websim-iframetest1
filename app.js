import { 
    TARGET_ORIGIN, 
    LOG_RECEIVED_MESSAGES, 
    MESSAGE_STYLE, 
    ANIMATION_DURATION,
    MAX_MESSAGES,
    CLEAR_INPUT_AFTER_SEND,
    BUTTON_TEXT,
    INPUT_PLACEHOLDER,
    TIMESTAMP_FORMAT
} from './config.js';

// DOM elements
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const messagesContainer = document.getElementById('messagesContainer');
const connectionStatus = document.getElementById('connectionStatus');

// Track connection status
/* @tweakable Time to wait before considering connection failed (ms) */
const CONNECTION_TIMEOUT = 5000;
let connectionEstablished = false;

// Initialize the page
function init() {
    // Set up the button text and input placeholder from config
    sendButton.textContent = BUTTON_TEXT;
    messageInput.placeholder = INPUT_PLACEHOLDER;
    
    // Add event listeners
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', event => {
        if (event.key === 'Enter') sendMessage();
    });
    
    // Listen for messages from parent window
    window.addEventListener('message', receiveMessage);
    
    // Notify parent that iframe is ready
    sendReadyMessage();
    
    // Set timeout for connection check
    setTimeout(() => {
        if (!connectionEstablished) {
            addMessageToUI("Warning: No response received from parent frame. Check that your domains match and postMessage is working.");
        }
    }, CONNECTION_TIMEOUT);
}

// Send message to parent window
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    const messageData = {
        type: 'userMessage',
        data: message,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Post message to parent
        window.parent.postMessage(messageData, TARGET_ORIGIN);
        
        if (CLEAR_INPUT_AFTER_SEND) {
            messageInput.value = '';
        }
        
        // Add send indicator to UI
        addMessageToUI(`Sent: ${message}`, true);
    } catch (error) {
        addMessageToUI(`Error sending message: ${error.message}`, false);
        console.error("Error sending message:", error);
    }
}

// Notify parent that iframe is ready
function sendReadyMessage() {
    const readyMessage = {
        type: 'iframeReady',
        source: 'iframetest1',
        timestamp: new Date().toISOString()
    };
    
    try {
        window.parent.postMessage(readyMessage, TARGET_ORIGIN);
        addMessageToUI("Ready message sent to parent", true);
    } catch (error) {
        addMessageToUI(`Error sending ready message: ${error.message}`, false);
        console.error("Error sending ready message:", error);
    }
}

// Handle received messages
function receiveMessage(event) {
    // Security check for allowed origins
    /* @tweakable List of allowed origins */
    const ALLOWED_ORIGINS = ["https://websim.ai"];
    
    if (!ALLOWED_ORIGINS.some(origin => event.origin.startsWith(origin))) {
        console.warn('Received message from untrusted origin:', event.origin);
        return;
    }
    
    // Update connection status
    if (!connectionEstablished) {
        connectionEstablished = true;
        connectionStatus.textContent = "Connected to parent";
        connectionStatus.classList.remove("disconnected");
        connectionStatus.classList.add("connected");
    }
    
    const message = event.data;
    
    if (LOG_RECEIVED_MESSAGES) {
        console.log('Received message from:', event.origin, 'data:', message);
    }
    
    // Process different message types
    if (typeof message === 'object') {
        // Display message in UI
        if (message.data !== undefined) {
            addMessageToUI(`Received: ${message.data}`);
            
            // Send acknowledgment back
            const ack = {
                type: 'acknowledgment',
                receivedMessageId: message.id || 'unknown',
                timestamp: new Date().toISOString()
            };
            window.parent.postMessage(ack, TARGET_ORIGIN);
        }
        
        // Handle specific message types if needed
        switch (message.type) {
            case 'parentCommand':
                // Handle parent commands here
                break;
            case 'connectionCheck':
                // Respond to connection checks
                window.parent.postMessage({
                    type: 'connectionResponse',
                    source: 'iframetest1',
                    timestamp: new Date().toISOString()
                }, TARGET_ORIGIN);
                break;
            // Add other message types as needed
        }
    } else {
        // Simple string message
        addMessageToUI(`Received: ${message}`);
    }
}

// Add message to UI
function addMessageToUI(text, isSent = false) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    const timestamp = new Date().toLocaleTimeString([], TIMESTAMP_FORMAT);
    
    messageElement.textContent = `[${timestamp}] ${text}`;
    
    // Apply styles from config
    messageElement.style.backgroundColor = isSent ? '#f0f8ff' : MESSAGE_STYLE.backgroundColor;
    messageElement.style.borderLeftColor = MESSAGE_STYLE.borderColor;
    messageElement.style.color = MESSAGE_STYLE.textColor;
    messageElement.style.fontSize = MESSAGE_STYLE.fontSize;
    
    // Apply animation
    messageElement.style.animation = `fadeIn ${ANIMATION_DURATION}ms ease-in`;
    
    // Add message to container
    messagesContainer.prepend(messageElement);
    
    // Limit number of messages
    while (messagesContainer.children.length > MAX_MESSAGES) {
        messagesContainer.removeChild(messagesContainer.lastChild);
    }
}

// Initialize the page when DOM is ready
document.addEventListener('DOMContentLoaded', init);