/* jshint esversion:6 */
const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    entry: ['babel-polyfill', './src/index.js'],
    plugins: [
	new CleanWebpackPlugin(['static']),
	new HtmlWebpackPlugin({
	    title: 'Fieldwork',
	    template: 'templates/index.html'
	}),
	new webpack.ProvidePlugin({
	    $: 'jquery',
	    jQuery: 'jquery',
	    'window.jQuery': 'jquery',
	    Popper: ['popper.js', 'default']
	}),
	/* 
	   new UglifyJSPlugin(),
	   new webpack.DefinePlugin({
	   'process.env': {
	   'NODE_ENV': JSON.stringify('production')
	   }
	   }) 
	*/
    ],
    devtool: 'source-map',
    output: {
	filename: 'bundle.js',
	path: path.resolve(__dirname, 'static')
    },
    resolve: {
	alias: process.env.NODE_ENV !== 'production' ? {
	    'vue$': 'vue/dist/vue.esm.js' // 'vue/dist/vue.common.js' for webpack 1
	} : {}
    },
    module: {
	rules: [{
	    test: /\.css$/,
	    use: ['style-loader', 'css-loader']
	},
		{
		    test: /\.(png|svg|jpg|gif)$/,
		    use: ['file-loader']
		},
		{
		    test: /\.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
		    loader: ['file-loader']
		},
		{
		    test: /\.js$/,
		    use: 'babel-loader',
		    exclude: /node_modules/
		}
	       ]
    }
};
