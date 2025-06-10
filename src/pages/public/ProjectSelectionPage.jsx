import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';

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
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", user.email));
      const userQuerySnapshot = await getDocs(q);

      if (!userQuerySnapshot.empty) {
        const userData = userQuerySnapshot.docs[0].data();
        const projectIds = userData.mappedProjects || [];

        if (projectIds.length > 0) {
          const projectsRef = collection(db, "projects");
          const projectsQuery = query(projectsRef, where("__name__", "in", projectIds));
          const projectsSnapshot = await getDocs(projectsQuery);
          setProjects(projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      }
      setLoading(false);
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
