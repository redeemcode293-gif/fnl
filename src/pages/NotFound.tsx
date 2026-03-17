import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Immediately redirect to home - no 404 page shown
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
};

export default NotFound;