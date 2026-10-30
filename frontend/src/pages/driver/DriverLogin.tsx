import React from 'react';
import { StudentLogin } from '../student/StudentLogin';

export const DriverLogin: React.FC = () => {
  return <StudentLogin initialRole="DRIVER" />;
};

export default DriverLogin;
