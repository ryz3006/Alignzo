import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { doc, getDoc, collection, query, where } from 'firebase/firestore';

const ProjectSelectionPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchUserAndProjects = async () => {
      try {
        // Use a direct 'get' on the user's document using their email as the ID
        const userDocRef = doc(db, "users", user.email);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const projectIds = userData.mappedProjects || [];

          if (projectIds.length > 0) {
            // Fetch each project document individually using getDoc
            const projectPromises = projectIds.map(id => getDoc(doc(db, "projects", id)));
            const projectSnapshots = await Promise.all(projectPromises);
            
            const userProjects = projectSnapshots
              .filter(docSnap => docSnap.exists())
              .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
              
            setProjects(userProjects);
          } else {
             // If user exists but has no projects
             navigate('/no-projects');
          }
        } else {
            // If the user document doesn't exist at all
            navigate('/no-projects');
        }
      } catch (error) {
          console.error("Error fetching user projects:", error);
          // Redirect to no-projects page on any error, including permission denied
          navigate('/no-projects');
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

  if (loading) {
      return <div className="dark:text-white text-center p-10">Loading projects...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
            <h1 className="text-2xl font-bold text-center dark:text-white">Select a Project</h1>
            <div className="space-y-4">
                {projects.map(project => (
                    <button key={project.id} onClick={() => selectProject(project.id)} className="w-full p-4 text-left bg-gray-50 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors">
                        <p className="font-semibold text-lg dark:text-white">{project.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{project.projectCode}</p>
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};

export default ProjectSelectionPage;
