import { RouteObject } from 'react-router-dom';
import RootLayout from './_layout';
import HomeScreen from './index';
import SettingsLayout from './settings/_layout';
import SettingsScreen from './settings/index';
import QRExportScreen from './settings/qr-export';
import QRImportScreen from './settings/qr-import';
import PortfolioDetailScreen from './portfolio/[id]';
import CreatePortfolioScreen from './portfolio/create';
import EditPortfolioScreen from './portfolio/edit/[id]';
import AssetDetailScreen from './asset/[id]';
import AddAssetScreen from './asset/add';
import EditAssetScreen from './asset/edit/[id]';
import AddLotScreen from './lot/add';
import CloseLotScreen from './lot/close';
import EditLotScreen from './lot/edit';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomeScreen /> },
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <SettingsScreen /> },
          { path: 'qr-export', element: <QRExportScreen /> },
          { path: 'qr-import', element: <QRImportScreen /> },
        ],
      },
      { path: 'portfolio/create', element: <CreatePortfolioScreen /> },
      { path: 'portfolio/edit/:id', element: <EditPortfolioScreen /> },
      { path: 'portfolio/:id', element: <PortfolioDetailScreen /> },
      { path: 'asset/add', element: <AddAssetScreen /> },
      { path: 'asset/edit/:id', element: <EditAssetScreen /> },
      { path: 'asset/:id', element: <AssetDetailScreen /> },
      { path: 'lot/add', element: <AddLotScreen /> },
      { path: 'lot/close', element: <CloseLotScreen /> },
      { path: 'lot/edit', element: <EditLotScreen /> },
    ],
  },
];
