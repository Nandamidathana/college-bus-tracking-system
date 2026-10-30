import React from 'react';
import { StudentLogin } from '../student/StudentLogin';

export const AdminLogin: React.FC = () => {
  return <StudentLogin initialRole="ADMIN" />;
};

export default AdminLogin;
