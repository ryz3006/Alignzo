import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext'; // Import project context hook
import LogoOnly from '../../assets/images/Logo_only.png';

const ProjectSelectionPage = () => {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const { isAppLoading, setIsAppLoading } = useAuth();
  const { loadProject } = useProject(); // Use context
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchUserAndProjects = async () => {
      setError('');
      setIsAppLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", user.email));
        const userQuerySnapshot = await getDocs(q);

        if (!userQuerySnapshot.empty) {
          const userData = userQuerySnapshot.docs[0].data();
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
            await signOut(auth);
            setError("Access denied. Please contact your administrator.");
        }
      } catch (error) {
          console.error("Error fetching user projects:", error);
          setError("Could not load your projects. Please try again later.");
      } finally {
        setIsAppLoading(false);
      }
    };

    fetchUserAndProjects();
  }, [user, navigate, setIsAppLoading]);

  const handleSelectProject = async (projectId) => {
    await loadProject(projectId); // Set project in context
    navigate('/user/dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isAppLoading) {
      return null; // The global loader in App.jsx will be shown
  }

  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem'}}>
      <div className="neumorph-outset" style={{width: '100%', maxWidth: '600px', padding: '2rem', display: 'flex', flexDirection: 'column', maxHeight: '90vh'}}>
        <div style={{textAlign: 'center', marginBottom: '2rem', flexShrink: 0}}>
            <div className="neumorph-outset" style={{width: '90px', height: '90px', margin: '0 auto', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <img src={LogoOnly} alt="Alignzo Logo" style={{width: '50px', height: '50px'}} />
            </div>
            <h1 className="text-primary" style={{fontSize: '2rem', fontWeight: '700', marginTop: '1rem'}}>Select Your Project</h1>
            <p style={{marginTop: '0.5rem', fontWeight: 500}}>Choose a project to continue to your dashboard.</p>
        </div>
        
        {error && <p style={{color: 'red', textAlign: 'center', marginBottom: '1rem'}}>{error}</p>}
        
        <div style={{flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '1rem'}}>
            {projects.map(project => (
                <button 
                    key={project.id} 
                    onClick={() => handleSelectProject(project.id)} 
                    className="btn neumorph-outset"
                    style={{justifyContent: 'space-between', textAlign: 'left'}}
                >
                    <div style={{flexGrow: 1}}>
                        <p style={{margin: 0, fontWeight: '600'}} className="text-strong">{project.name}</p>
                        <p style={{margin: '0.25rem 0 0 0', fontSize: '0.8rem', fontFamily: 'monospace'}}>{project.projectCode}</p>
                    </div>
                    <span>&rarr;</span>
                </button>
            ))}
        </div>
        
        <div style={{marginTop: '2rem', borderTop: '2px solid var(--light-shadow-dark)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'center', flexShrink: 0}}>
            <button onClick={handleLogout} className="btn neumorph-outset" style={{color: '#e53e3e', fontWeight: 600}}>
                Logout
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSelectionPage;
