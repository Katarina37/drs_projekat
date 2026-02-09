import { NavLink } from 'react-router-dom';
import { 
  Plane, 
  LayoutDashboard, 
  Users, 
  Ticket, 
  Building2, 
  Star, 
  Settings, 
  LogOut,
  PlaneTakeoff,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '..';
import { UserRole } from '../../types';

export function Sidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    {
      section: 'Glavni meni',
      items: [
        { path: '/dashboard', label: 'Kontrolna tabla', icon: LayoutDashboard },
        { path: '/flights', label: 'Letovi', icon: Plane },
        { path: '/my-tickets', label: 'Moje karte', icon: Ticket },
      ],
    },
    {
      section: 'Menadžment',
      roles: [UserRole.MENADZER],
      items: [
        { path: '/create-flight', label: 'Kreiraj let', icon: PlaneTakeoff },
        { path: '/my-flights', label: 'Moji letovi', icon: ClipboardList },
        { path: '/airlines', label: 'Avio kompanije', icon: Building2 },
      ],
    },
    {
      section: 'Administracija',
      roles: [UserRole.ADMINISTRATOR],
      items: [
        { path: '/users', label: 'Korisnici', icon: Users },
        { path: '/pending-flights', label: 'Odobrenja', icon: ClipboardList },
        { path: '/ratings', label: 'Ocene', icon: Star },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Plane size={24} />
        </div>
        <span className="sidebar-title">Avio Letovi</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => {
          // Check if user has access to this section
          if (section.roles && user && !section.roles.includes(user.uloga)) {
            return null;
          }

          return (
            <div key={section.section} className="sidebar-section">
              <div className="sidebar-section-title">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'active' : ''}`
                  }
                >
                  <item.icon className="sidebar-link-icon" size={20} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/profile" className="sidebar-user">
          <Avatar
            name={user ? `${user.ime} ${user.prezime}` : 'U'}
            src={user?.profilna_slika}
            size="sm"
          />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {user ? `${user.ime} ${user.prezime}` : 'Korisnik'}
            </div>
            <div className="sidebar-user-role">
              {user?.uloga === UserRole.ADMINISTRATOR
                ? 'Administrator'
                : user?.uloga === UserRole.MENADZER
                ? 'Menadžer'
                : 'Korisnik'}
            </div>
          </div>
          <Settings size={18} style={{ color: 'var(--text-tertiary)' }} />
        </NavLink>

        <button
          onClick={handleLogout}
          className="sidebar-link sidebar-link-danger"
          style={{ marginTop: 'var(--spacing-sm)', width: '100%' }}
          type="button"
        >
          <LogOut className="sidebar-link-icon" size={20} />
          Odjava
        </button>
      </div>
    </aside>
  );
}
