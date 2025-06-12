import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }) => {
    const [selectedProject, setSelectedProject] = useState(null);
    const [loading, setLoading] = useState(false);
    const { currentUser } = useAuth();

    const loadProject = async (projectId) => {
        if (!projectId) {
            setSelectedProject(null);
            return;
        }
        setLoading(true);
        try {
            const projectDocRef = doc(db, 'projects', projectId);
            const projectDocSnap = await getDoc(projectDocRef);
            if (projectDocSnap.exists()) {
                const projectData = { id: projectDocSnap.id, ...projectDocSnap.data() };
                setSelectedProject(projectData);
                sessionStorage.setItem('selectedProject', JSON.stringify(projectData));
            } else {
                console.error("Selected project not found in Firestore.");
                clearProject();
            }
        } catch (error) {
            console.error("Error loading project:", error);
        } finally {
            setLoading(false);
        }
    };

    const clearProject = () => {
        setSelectedProject(null);
        sessionStorage.removeItem('selectedProject');
    };

    // On initial load or user change, check session storage
    useEffect(() => {
        if (currentUser) {
            const storedProjectData = sessionStorage.getItem('selectedProject');
            if (storedProjectData) {
                setSelectedProject(JSON.parse(storedProjectData));
            }
        } else {
            clearProject();
        }
    }, [currentUser]);

    const value = {
        selectedProject,
        loadProject,
        clearProject,
        loading
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};
