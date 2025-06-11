import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import LogoOnly from '../../assets/images/Logo_only.png';

const ProjectSelectionPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchUserAndProjects = async () => {
      setError('');
      try {
        const userDocRef = doc(db, "users", user.email);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const projectIds = userData.mappedProjects || [];

          if (projectIds.length > 0) {
            const projectPromises = projectIds.map(id => getDoc(doc(db, "projects", id)));
            const projectSnapshots = await Promise.all(projectPromises);
            
            const userProjects = projectSnapshots
              .filter(docSnap => docSnap.exists())
              .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
              
            setProjects(userProjects);
          } else {
             navigate('/no-projects');
          }
        } else {
            navigate('/no-projects');
        }
      } catch (error) {
          console.error("Error fetching user projects:", error);
          setError("Could not load your projects. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProjects();
  }, [user, navigate]);

  const selectProject = (projectId) => {
    sessionStorage.setItem('selectedProject', projectId);
    navigate('/user/dashboard');
  };

  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem'}}>
      <div className="neumorph-outset" style={{width: '100%', maxWidth: '600px', padding: '2rem'}}>
        <div style={{textAlign: 'center', marginBottom: '2rem'}}>
            <div className="neumorph-outset" style={{width: '90px', height: '90px', margin: '0 auto', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <img src={LogoOnly} alt="Alignzo Logo" style={{width: '50px', height: '50px'}} />
            </div>
            <h1 className="text-primary" style={{fontSize: '2rem', fontWeight: '700', marginTop: '1rem'}}>Select Your Project</h1>
            <p style={{marginTop: '0.5rem', fontWeight: 500}}>Choose a project to continue to your dashboard.</p>
        </div>
        
        {loading && <p style={{textAlign: 'center'}}>Loading projects...</p>}
        {error && <p style={{color: 'red', textAlign: 'center'}}>{error}</p>}
        
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            {!loading && projects.map(project => (
                <button 
                    key={project.id} 
                    onClick={() => selectProject(project.id)} 
                    className="btn neumorph-outset"
                    style={{justifyContent: 'flex-start', textAlign: 'left'}}
                >
                    <div style={{flexGrow: 1}}>
                        <p style={{margin: 0, fontWeight: '600'}} className="text-strong">{project.name}</p>
                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.8rem', fontFamily: 'monospace'}}>{project.projectCode}</p>
                    </div>
                    <span>&rarr;</span>
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectSelectionPage;
