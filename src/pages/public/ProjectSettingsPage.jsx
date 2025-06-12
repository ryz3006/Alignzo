import React from 'react';
import { useNavigate } from 'react-router-dom';

const SettingsCard = ({ title, description, buttonText, onClick }) => (
    <div className="neumorph-outset" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderRadius: '12px'}}>
        <h3 style={{margin: 0, fontSize: '1.25rem', fontWeight: '600'}} className="text-strong">{title}</h3>
        <p style={{margin: 0, flexGrow: 1}}>{description}</p>
        <button onClick={onClick} className="btn neumorph-outset" style={{alignSelf: 'flex-start', color: 'var(--light-primary)'}}>
            {buttonText}
        </button>
    </div>
);

const ProjectSettingsPage = () => {
    const navigate = useNavigate();

    const handleSwitchProject = () => {
        sessionStorage.removeItem('selectedProject');
        navigate('/project-selection');
    };
    
    return (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
            <SettingsCard 
                title="Switch Project" 
                description="Go back to the project selection screen to choose a different project to work on."
                buttonText="Switch Project" 
                onClick={handleSwitchProject} 
            />
            <SettingsCard 
                title="Manage Modules" 
                description="Add or remove modules specific to this project."
                buttonText="Configure Modules" 
                onClick={() => alert('Feature coming soon!')} 
            />
            <SettingsCard 
                title="Manage Item Types" 
                description="Define the types of tasks or issues for project operations (e.g., Bug, Feature, Task)."
                buttonText="Configure Types" 
                onClick={() => alert('Feature coming soon!')} 
            />
        </div>
    );
};

export default ProjectSettingsPage;
