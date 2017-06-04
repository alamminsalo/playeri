# Builds a minified js file => jssource.min.js
# Dependencies: uglifier (install by `gem install uglifier`)
#
# Run with `ruby build.rb`

require "uglifier"

#Target file
minfile = File.open("playeri.min.js", "w") 

#Add js source files here in inclusion order
files = ["playeri.js"]

#Compress files and write the outputs to target file
files.each do | file |
	minfile << Uglifier.compile(File.read(file))
end

minfile.close()

# Exit
