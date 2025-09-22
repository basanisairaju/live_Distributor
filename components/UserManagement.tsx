import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { User, UserRole, Store } from '../types';
import { useAuth } from '../hooks/useAuth';
import Card from './common/Card';
import Button from './common/Button';
import { PlusCircle, Edit, Trash2, XCircle, UserCog, Save } from 'lucide-react';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHeader from './common/SortableTableHeader';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import Input from './common/Input';
import Select from './common/Select';
import { assignableMenuItems } from '../constants';


const UserModal: React.FC<{ user: User | null, onClose: () => void, onSave: () => void, stores: Store[] }> = ({ user, onClose, onSave, stores }) => {
    const { currentUser } = useAuth();
    const { register, handleSubmit, formState: { errors, isValid }, watch, control } = useForm<User>({
        mode: 'onBlur',
        defaultValues: {
            username: user?.username || '',
            role: user?.role || UserRole.USER,
            storeId: user?.storeId || '',
            permissions: user?.permissions || [],
        },
    });
    const watchedRole = watch('role');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onFormSubmit: SubmitHandler<User> = async (data) => {
        if (!currentUser) return;
        setLoading(true);
        setError(null);
        try {
            if (user) { // Editing
                await api.updateUser({ ...user, ...data }, currentUser.role);
            } else { // Creating
                if (!data.password) {
                    setError("Password is required for new users.");
                    setLoading(false);
                    return;
                }
                await api.addUser(data, currentUser.role);
            }
            onSave();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save user.");
        } finally {
            setLoading(false);
        }
    };
    
    const availableRoles = () => {
        if (currentUser?.role === UserRole.PLANT_ADMIN) {
            return Object.values(UserRole);
        }
        if (currentUser?.role === UserRole.STORE_ADMIN) {
            return [UserRole.EXECUTIVE, UserRole.USER];
        }
        return [];
    }

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{user ? 'Edit' : 'Create'} User</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-background"><XCircle /></button>
                </div>
                <form onSubmit={handleSubmit(onFormSubmit)}>
                    <div className="p-6 space-y-4">
                        <Input
                            label="Username / Email"
                            {...register('username', { required: "Username is required" })}
                            error={errors.username?.message}
                        />
                         <Input
                            label={`Password ${user ? '(leave blank to keep unchanged)' : ''}`}
                            type="password"
                            {...register('password', { required: !user })}
                            error={errors.password?.message}
                        />
                        <Select
                            label="Role"
                            {...register('role', { required: "Role is required" })}
                            defaultValue={user?.role}
                            error={errors.role?.message}
                        >
                            {availableRoles().map(role => <option key={role} value={role}>{role}</option>)}
                        </Select>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-contentSecondary">Menu Permissions</label>
                            <div className="p-3 border rounded-lg max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50">
                                <Controller
                                    name="permissions"
                                    control={control}
                                    render={({ field }) => (
                                        <>
                                            {assignableMenuItems.map(item => (
                                                <div key={item.path} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`perm-${item.path}`}
                                                        checked={field.value?.includes(item.path)}
                                                        onChange={e => {
                                                            const newPermissions = e.target.checked
                                                                ? [...(field.value || []), item.path]
                                                                : (field.value || []).filter(p => p !== item.path);
                                                            field.onChange(newPermissions);
                                                        }}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <label htmlFor={`perm-${item.path}`} className="ml-2 block text-sm text-content">
                                                        {item.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                />
                            </div>
                        </div>

                        {currentUser?.role === UserRole.PLANT_ADMIN && (
                            <Select
                                label="Assign to Store (optional)"
                                {...register('storeId')}
                                defaultValue={user?.storeId}
                            >
                                <option value="">None (Plant-level)</option>
                                {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                            </Select>
                        )}

                         {error && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>}
                    </div>
                    <div className="p-4 bg-background border-t flex justify-end gap-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" isLoading={loading} disabled={!isValid}>
                            <Save size={16} /> {user ? 'Save Changes' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const UserManagementPage: React.FC = () => {
    const { currentUser, portal } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    
    const { items: sortedUsers, requestSort, sortConfig } = useSortableData(users, { key: 'username', direction: 'ascending' });

    const fetchUsersAndStores = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [userData, storeData] = await Promise.all([
                api.getUsers(portal),
                api.getStores()
            ]);
            setUsers(userData);
            setStores(storeData);
        } catch (err) {
            setError("Failed to fetch user data.");
        } finally {
            setLoading(false);
        }
    }, [portal]);

    useEffect(() => {
        fetchUsersAndStores();
    }, [fetchUsersAndStores]);

    const handleAddNew = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };
    
    const canManageUser = (targetUser: User): boolean => {
        if (!currentUser) return false;
        // Plant admin can manage anyone except themselves
        if (currentUser.role === UserRole.PLANT_ADMIN) {
            return currentUser.id !== targetUser.id;
        }
        // Store admin can only manage executives and users in their store
        if (currentUser.role === UserRole.STORE_ADMIN) {
            return (targetUser.role === UserRole.EXECUTIVE || targetUser.role === UserRole.USER) &&
                   targetUser.storeId === currentUser.storeId;
        }
        return false;
    };


    const handleDelete = async (user: User) => {
        if (!currentUser) return;
        if (window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
            setError(null);
            try {
                await api.deleteUser(user.id, currentUser.id, currentUser.role);
                fetchUsersAndStores();
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred while deleting.");
            }
        }
    };
    
    const handleSave = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        fetchUsersAndStores();
    };

    const getStoreName = (storeId?: string) => {
        if (!storeId) return 'Plant';
        return stores.find(s => s.id === storeId)?.name || 'Unknown Store';
    };

    if (!currentUser?.permissions?.includes('/users/manage')) {
        return (
            <Card className="text-center">
                <p className="text-contentSecondary">You do not have permission to manage users.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold">Manage Users</h2>
                    <Button onClick={handleAddNew} className="w-full sm:w-auto"><PlusCircle size={16}/> Add New User</Button>
                </div>
                {error && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">{error}</div>}
                
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <SortableTableHeader label="Username" sortKey="username" requestSort={requestSort} sortConfig={sortConfig} />
                                <SortableTableHeader label="Role" sortKey="role" requestSort={requestSort} sortConfig={sortConfig} />
                                <SortableTableHeader label="Assignment" sortKey="storeId" requestSort={requestSort} sortConfig={sortConfig} />
                                <th className="p-3 text-right font-semibold text-contentSecondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedUsers.map(user => (
                                <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50">
                                    <td className="p-3 font-semibold">{user.username}</td>
                                    <td className="p-3">{user.role}</td>
                                    <td className="p-3">{getStoreName(user.storeId)}</td>
                                    <td className="p-3 text-right space-x-2">
                                        <Button onClick={() => handleEdit(user)} variant="secondary" size="sm" disabled={!canManageUser(user)}><Edit size={14}/></Button>
                                        <Button onClick={() => handleDelete(user)} variant="danger" size="sm" disabled={!canManageUser(user)}><Trash2 size={14}/></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {sortedUsers.map(user => (
                        <Card key={user.id}>
                            <p className="font-bold text-content">{user.username}</p>
                            <div className="mt-2 pt-2 border-t text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-contentSecondary">Role:</span>
                                    <span className="font-medium">{user.role}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-contentSecondary">Assignment:</span>
                                    <span className="font-medium">{getStoreName(user.storeId)}</span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                                <Button onClick={() => handleEdit(user)} variant="secondary" size="sm" disabled={!canManageUser(user)}><Edit size={14}/></Button>
                                <Button onClick={() => handleDelete(user)} variant="danger" size="sm" disabled={!canManageUser(user)}><Trash2 size={14}/></Button>
                            </div>
                        </Card>
                    ))}
                </div>

                {loading && <p className="text-center p-4">Loading users...</p>}
                {!loading && users.length === 0 && <p className="text-center p-8 text-contentSecondary">No users found.</p>}
            </Card>

            {isModalOpen && (
                <UserModal
                    user={editingUser}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    stores={stores}
                />
            )}
        </div>
    );
};


export default UserManagementPage;