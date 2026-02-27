/**
 * Smart Attendance System - Authentication Manager
 * Phase 1: Registration & Login (with MySQL Backend)
 */

// Get the server URL dynamically - works on localhost and remote IP
const getServerURL = () => {
    // If accessed from localhost, use localhost with http
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    }
    // Otherwise use the same host (http protocol)
    return `http://${window.location.hostname}:5000/api`;
};

const API_URL = getServerURL();

class AuthManager {
    // Constants
    static CURRENT_USER_KEY = 'attendance_current_user';

    /**
     * Register a new student
     * @param {Object} studentData - { name, roll, password, image, faceDescriptor }
     * @returns {Object} - { success: boolean, message: string }
     */
    static async register(studentData) {
        try {
            // Validate required fields
            if (!studentData.name || !studentData.roll || !studentData.password || !studentData.image) {
                return {
                    success: false,
                    message: 'All fields are required!'
                };
            }

            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: studentData.name.trim(),
                    roll: studentData.roll.trim(),
                    password: studentData.password,
                    image: studentData.image,
                    faceDescriptor: studentData.faceDescriptor || null
                })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                message: 'Registration failed. Make sure the server is running on http://localhost:5000'
            };
        }
    }

    /**
     * Login a student
     * @param {string} roll - Roll number
     * @param {string} password - Password
     * @returns {Object} - { success: boolean, message: string, student?: Object, approvalStatus?: string }
     */
    static async login(roll, password) {
        try {
            // Validate inputs
            if (!roll || !password) {
                return {
                    success: false,
                    message: 'Roll number and password are required!'
                };
            }

            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roll: roll.trim(),
                    password: password
                })
            });

            const result = await response.json();

            // Log response for debugging
            console.log('Login response:', result);

            if (response.ok && result.success) {
                // Save session
                sessionStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(result.student));
                return result;
            } else {
                // Return error response (including approval status info)
                return result;
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'Login failed. Make sure the server is running on http://localhost:5000'
            };
        }
    }

    /**
     * Logout current user
     */
    static logout() {
        sessionStorage.removeItem(this.CURRENT_USER_KEY);
    }

    /**
     * Get currently logged-in user
     * @returns {Object|null}
     */
    static getCurrentUser() {
        const userJson = sessionStorage.getItem(this.CURRENT_USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    }

    /**
     * Get all registered students
     * @returns {Promise<Array>}
     */
    static async getAllStudents() {
        try {
            const response = await fetch(`${API_URL}/students`);
            const result = await response.json();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('Error fetching students:', error);
            return [];
        }
    }

    /**
     * Get student by roll number
     * @param {string} roll
     * @returns {Promise<Object|null>}
     */
    static async getStudentByRoll(roll) {
        try {
            const response = await fetch(`${API_URL}/student/${roll}`);
            const result = await response.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error('Error fetching student:', error);
            return null;
        }
    }

    /**
     * Get student by ID
     * @param {number} id
     * @returns {Promise<Object|null>}
     */
    static async getStudentById(id) {
        try {
            const students = await this.getAllStudents();
            return students.find(s => s.id === id) || null;
        } catch (error) {
            console.error('Error fetching student:', error);
            return null;
        }
    }

    /**
     * Get student's face descriptor for login verification
     * @param {string} roll - Student roll number
     * @returns {Promise<Object>} - { hasFaceDescriptor: boolean, descriptor: Array|null }
     */
    static async getFaceDescriptor(roll) {
        try {
            const response = await fetch(`${API_URL}/student/${roll}/face`);
            const result = await response.json();
            
            if (result.success) {
                return result.data;
            } else {
                console.error('Error fetching face descriptor:', result.message);
                return { hasFaceDescriptor: false, descriptor: null };
            }
        } catch (error) {
            console.error('Error fetching face descriptor:', error);
            return { hasFaceDescriptor: false, descriptor: null };
        }
    }

    /**
     * Calculate distance between two face descriptors
     * @param {Array} descriptor1 - First face descriptor
     * @param {Array} descriptor2 - Second face descriptor
     * @returns {number} - Distance (0-1, lower is more similar)
     */
    static calculateFaceDistance(descriptor1, descriptor2) {
        if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
            return 1; // Maximum distance if invalid
        }

        let sum = 0;
        for (let i = 0; i < descriptor1.length; i++) {
            const diff = descriptor1[i] - descriptor2[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    /**
     * Check if two faces match (based on distance threshold)
     * @param {Array} descriptor1 - First face descriptor
     * @param {Array} descriptor2 - Second face descriptor
     * @param {number} threshold - Distance threshold (default 0.6 for strict matching)
     * @returns {boolean} - True if faces match
     */
    static faceMatch(descriptor1, descriptor2, threshold = 0.6) {
        const distance = this.calculateFaceDistance(descriptor1, descriptor2);
        console.log(`Face distance: ${distance.toFixed(4)}, threshold: ${threshold}`);
        return distance < threshold;
    }

    /**
     * Get pending and rejected students (for admin)
     * @returns {Promise<Array>}
     */
    static async getPendingStudents() {
        try {
            const response = await fetch(`${API_URL}/students/pending/list`);
            const result = await response.json();
            
            if (result.success) {
                return result.data || [];
            } else {
                console.error('Error fetching pending students:', result.message);
                return [];
            }
        } catch (error) {
            console.error('Error fetching pending students:', error);
            return [];
        }
    }

    /**
     * Approve a student registration
     * @param {string} roll - Student roll number
     * @returns {Promise<Object>}
     */
    static async approveStudent(roll) {
        try {
            const response = await fetch(`${API_URL}/student/${roll}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error approving student:', error);
            return {
                success: false,
                message: 'Failed to approve student'
            };
        }
    }

    /**
     * Reject a student registration
     * @param {string} roll - Student roll number
     * @returns {Promise<Object>}
     */
    static async rejectStudent(roll) {
        try {
            const response = await fetch(`${API_URL}/student/${roll}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error rejecting student:', error);
            return {
                success: false,
                message: 'Failed to reject student'
            };
        }
    }
}

/**
 * Utility function to check if user is authenticated
 * @returns {boolean}
 */
function isAuthenticated() {
    return AuthManager.getCurrentUser() !== null;
}

/**
 * Utility function to redirect if not authenticated
 * @param {string} redirectTo - Page to redirect to if not authenticated
 */
function requireAuth(redirectTo = 'login.html') {
    if (!isAuthenticated()) {
        window.location.href = redirectTo;
    }
}
